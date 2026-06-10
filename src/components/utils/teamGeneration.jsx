// Initialize empty teams structure
function initializeTeams(teamsCount) {
  return Array.from({ length: teamsCount }, (_, i) => ({
    team_name: `קבוצה ${i + 1}`,
    players: [],
    total_rating: 0,
    position_counts: {
      goalkeeper: 0,
      defender: 0,
      cb: 0,
      midfielder: 0,
      striker: 0,
    },
  }));
}

// Add a player to a team and update ratings/position counts
function addPlayerToTeam(team, player, defaultRating) {
  team.players.push(player);
  if (!player.is_unknown) {
    team.total_rating += player.skill_rating || defaultRating;
  }
  player.positions?.forEach(pos => {
    if (team.position_counts[pos] !== undefined) {
      team.position_counts[pos]++;
    }
  });
}

// ---------------------------------------------
// Position-aware helpers and scoring utilities
// ---------------------------------------------
const DEBUG_TEAM_GEN = false;

function parseFormation(formation) {
  return formation
    .split('-')
    .map(Number)
    .filter(n => !isNaN(n) && n >= 0);
}

function derivePositionTargets(formation, playersPerTeam) {
  const parts = parseFormation(formation);
  const defendersFromFormation = parts[0] || 0;
  const strikerFromFormation = parts.length > 0 ? parts[parts.length - 1] : 0;
  const midfieldFromFormation =
    parts.length > 2
      ? parts.slice(1, parts.length - 1).reduce((s, n) => s + n, 0)
      : parts[1] || 0;

  const fieldPlayers = parts.reduce((s, n) => s + n, 0);
  const hasGK = playersPerTeam > fieldPlayers ? 1 : 0;

  // CB minimum rule (choice 2.b): if defenders >= 2, require at least 1 CB
  const cbMin = defendersFromFormation >= 2 ? 1 : 0;
  const defenderTarget = Math.max(0, defendersFromFormation - cbMin);

  return {
    goalkeeper: hasGK,
    defender: defenderTarget,
    cb: cbMin,
    midfielder: Math.max(0, midfieldFromFormation),
    striker: Math.max(0, strikerFromFormation),
  };
}

function computeScarcity(attendingPlayers) {
  const positions = ['goalkeeper', 'defender', 'cb', 'midfielder', 'striker'];
  const supply = Object.fromEntries(positions.map(p => [p, 0]));
  attendingPlayers.forEach(p => {
    (p.positions || []).forEach(pos => {
      if (supply[pos] !== undefined) supply[pos]++;
    });
  });
  const raw = Object.fromEntries(
    positions.map(pos => [pos, 1 / (1 + supply[pos])])
  );
  // Normalize to max of 1
  const maxVal = Math.max(...Object.values(raw));
  if (maxVal === 0) return Object.fromEntries(positions.map(p => [p, 1]));
  return Object.fromEntries(
    positions.map(pos => [pos, raw[pos] / maxVal])
  );
}

function getAggregateDefenderTarget(targets) {
  return (targets.defender || 0) + (targets.cb || 0);
}

function computeDeficits(team, targets) {
  const counts = team.position_counts || {};
  const defAggTarget = getAggregateDefenderTarget(targets);
  const defAggHave = (counts.defender || 0) + (counts.cb || 0);
  const defAggDeficit = Math.max(0, defAggTarget - defAggHave);
  const cbMinDeficit = Math.max(0, (targets.cb || 0) - (counts.cb || 0));
  const gkDeficit = Math.max(0, (targets.goalkeeper || 0) - (counts.goalkeeper || 0));
  const midDeficit = Math.max(0, (targets.midfielder || 0) - (counts.midfielder || 0));
  const strDeficit = Math.max(0, (targets.striker || 0) - (counts.striker || 0));
  return {
    defAggTarget,
    defAggHave,
    defAggDeficit,
    cbMinDeficit,
    gkDeficit,
    midDeficit,
    strDeficit,
  };
}

function teamPositionPenalty(team, targets, disableGK = false) {
  const {
    defAggTarget,
    defAggDeficit,
    cbMinDeficit,
    gkDeficit,
    midDeficit,
    strDeficit,
  } = computeDeficits(team, targets);

  const norm = (defAggTarget || 1);
  // Weighted sum of normalized deficits; GK/CB minimum slightly emphasized
  const penalty =
    (disableGK ? 0 : (gkDeficit > 0 ? 1 : 0) * 1.2) +
    (cbMinDeficit > 0 ? cbMinDeficit : 0) * 1.1 +
    (defAggDeficit / Math.max(1, norm)) * 1.0 +
    (midDeficit / Math.max(1, targets.midfielder || 1)) * 0.9 +
    (strDeficit / Math.max(1, targets.striker || 1)) * 0.9;
  return penalty;
}

// weights per choice 1.a (rating primary)
const W = { rating: 0.6, position: 0.35, gk: 0.05 };

function scoreAssignment({ team, player, average, targets, scarcity }) {
  const r = player.is_unknown ? 0 : (player.skill_rating || 0);
  const newTotal = team.total_rating + r;
  const ratingScore =
    1 - Math.min(1, Math.abs(newTotal - (average || 1)) / Math.max(1, average || 1));

  const positions = player.positions || [];
  // Effective defender deficit (D + CB) and CB minimum deficit
  const { defAggTarget, defAggDeficit, cbMinDeficit } = computeDeficits(team, targets);

  const posNeed = positions.reduce((sum, pos) => {
    const scarcityW = scarcity[pos] ?? 1;
    if (pos === 'defender' || pos === 'cb') {
      const agg = defAggDeficit > 0 ? (defAggDeficit / Math.max(1, defAggTarget)) * scarcityW : 0;
      const cbBonus = (pos === 'cb' && cbMinDeficit > 0)
        ? (cbMinDeficit / Math.max(1, targets.cb || 1)) * (scarcity.cb ?? 1)
        : 0;
      return sum + agg + cbBonus;
    }
    const target = targets[pos] ?? 0;
    const have = (team.position_counts[pos] || 0);
    const deficit = Math.max(0, target - have);
    return sum + (deficit > 0 ? (deficit / Math.max(1, target)) * scarcityW : 0);
  }, 0);

  const gkBoost =
    positions.includes('goalkeeper') &&
    ((team.position_counts.goalkeeper || 0) === 0) &&
    (targets.goalkeeper || 0) > 0
      ? 1
      : 0;

  const score = W.rating * ratingScore + W.position * posNeed + W.gk * gkBoost;
  if (DEBUG_TEAM_GEN) {
    // eslint-disable-next-line no-console
    console.log('[scoreAssignment]', {
      team: team.team_name,
      player: player.name,
      ratingScore: ratingScore.toFixed(3),
      posNeed: posNeed.toFixed(3),
      gkBoost,
      total: score.toFixed(3),
    });
  }
  return score;
}

// Phase 1: Assign pre-assigned players to their designated teams
function assignPreAssignedPlayers(teams, attendingPlayers, preAssignedTeams, defaultRating) {
  const preAssignedPlayerIds = new Set();
  
  Object.entries(preAssignedTeams).forEach(([teamIndex, playerIds]) => {
    if (playerIds && playerIds.length > 0) {
      const teamIdx = parseInt(teamIndex);
      playerIds.forEach(playerId => {
        const player = attendingPlayers.find(p => p.id === playerId);
        if (player) {
          addPlayerToTeam(teams[teamIdx], player, defaultRating);
          preAssignedPlayerIds.add(playerId);
        }
      });
    }
  });
  
  return preAssignedPlayerIds;
}

// Phase 2: Assign friend groups to teams using rating+position scoring
function assignFriendGroups(teams, attendingPlayers, friendRestrictions, preAssignedPlayerIds, playersPerTeam, teamsCount, defaultRating, positionTargets, scarcity) {
  const friendGroupPlayerIds = new Set();
  
  friendRestrictions.forEach(group => {
    // Check if any group members are already pre-assigned
    const preAssignedMembers = group
      .map(id => ({
        id,
        player: attendingPlayers.find(p => p.id === id),
        teamIndex: teams.findIndex(team => team.players.some(p => p.id === id))
      }))
      .filter(m => m.player && preAssignedPlayerIds.has(m.id));
    
    // If multiple members are pre-assigned to different teams, ignore this group
    if (preAssignedMembers.length > 0) {
      const assignedTeams = new Set(preAssignedMembers.map(m => m.teamIndex));
      
      if (assignedTeams.size > 1) {
        console.warn(`Friend group has members pre-assigned to different teams - ignoring group`);
        return;
      }
      
      // All pre-assigned members are on the same team - assign remaining members there
      const targetTeamIndex = preAssignedMembers[0].teamIndex;
      const targetTeam = teams[targetTeamIndex];
      
      const remainingGroupPlayers = group
        .map(id => attendingPlayers.find(p => p.id === id))
        .filter(p => p && !preAssignedPlayerIds.has(p.id));
      
      if (remainingGroupPlayers.length === 0) return;
      
      // Check if target team has space for remaining members
      if (targetTeam.players.length + remainingGroupPlayers.length > playersPerTeam) {
        console.warn(`Cannot assign remaining friend group members to pre-assigned team - insufficient space`);
        return;
      }
      
      // Assign remaining members to the same team
      remainingGroupPlayers.forEach(player => {
        addPlayerToTeam(targetTeam, player, defaultRating);
        friendGroupPlayerIds.add(player.id);
      });
      
      return;
    }
    
    // No pre-assigned members - use score-based logic
    const groupPlayers = group
      .map(id => attendingPlayers.find(p => p.id === id))
      .filter(p => p);
    
    if (groupPlayers.length === 0) return;

    const teamsWithSpace = teams.filter(team =>
      team.players.length + groupPlayers.length <= playersPerTeam
    );

    if (teamsWithSpace.length === 0) {
      console.warn(`Cannot assign friend group of ${groupPlayers.length} players - no team has enough space`);
      return;
    }

    const average =
      teams.reduce((sum, t) => sum + t.total_rating, 0) / Math.max(1, teamsCount);

    // Pick team maximizing the sum of scores for all group members
    let bestTeam = teamsWithSpace[0];
    let bestScore = -Infinity;
    teamsWithSpace.forEach(team => {
      const totalScore = groupPlayers.reduce(
        (s, p) => s + scoreAssignment({ team, player: p, average, targets: positionTargets, scarcity }),
        0
      );
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestTeam = team;
      }
    });

    groupPlayers.forEach(player => {
      addPlayerToTeam(bestTeam, player, defaultRating);
      friendGroupPlayerIds.add(player.id);
    });
  });
  
  return friendGroupPlayerIds;
}

// Phase 3: Distribute known players with position-first rounds
function distributeKnownPlayers(teams, knownPlayers, playersPerTeam, defaultRating, positionTargets, scarcity) {
  const candidates = knownPlayers
    .map(p => ({ ...p, skill_rating: p.skill_rating || defaultRating }))
    .sort((a, b) => b.skill_rating - a.skill_rating);

  const assigned = new Set();
  const takeEligible = (predicate) => candidates.filter(p => !assigned.has(p.id) && predicate(p));
  const getAverage = () => teams.reduce((s, t) => s + t.total_rating, 0) / Math.max(1, teams.length);
  const teamsWithSpace = () => teams.filter(t => t.players.length < playersPerTeam);

  function assignBestPairs(players, teamFilter = () => true) {
    let placed = 0;
    const average = getAverage();
    // Try greedy: for each player, pick best team by score
    for (const player of players) {
      const possibleTeams = teamsWithSpace().filter(teamFilter);
      if (possibleTeams.length === 0) break;
      let bestTeam = null;
      let bestScore = -Infinity;
      for (const team of possibleTeams) {
        const score = scoreAssignment({
          team,
          player,
          average,
          targets: positionTargets,
          scarcity,
        });
        if (score > bestScore) {
          bestScore = score;
          bestTeam = team;
        }
      }
      if (bestTeam) {
        addPlayerToTeam(bestTeam, player, defaultRating);
        assigned.add(player.id);
        placed++;
      }
    }
    return placed;
  }

  const deficitsForTeam = (team) => computeDeficits(team, positionTargets);

  // Round 1: Goalkeepers for teams missing GK
  assignBestPairs(
    takeEligible(p => (p.positions || []).includes('goalkeeper')),
    t => computeDeficits(t, positionTargets).gkDeficit > 0
  );

  // Round 2: CB minimums where needed
  assignBestPairs(
    takeEligible(p => (p.positions || []).includes('cb')),
    t => computeDeficits(t, positionTargets).cbMinDeficit > 0
  );

  // Round 3: Fill aggregate defenders to target using D or CB
  assignBestPairs(
    takeEligible(p => {
      const pos = p.positions || [];
      return pos.includes('defender') || pos.includes('cb');
    }),
    t => deficitsForTeam(t).defAggDeficit > 0
  );

  // Round 4: Midfielders to target
  assignBestPairs(
    takeEligible(p => (p.positions || []).includes('midfielder')),
    t => deficitsForTeam(t).midDeficit > 0
  );

  // Round 5: Strikers to target
  assignBestPairs(
    takeEligible(p => (p.positions || []).includes('striker')),
    t => deficitsForTeam(t).strDeficit > 0
  );

  // Round 6: Remaining known players by highest score wherever there is space
  assignBestPairs(takeEligible(() => true));
}

// Helper function to check if a swap improves position distribution

// Update position counts when swapping two players
function updatePositionCountsForSwap(playerA, playerB, teamA, teamB) {
  playerA.positions?.forEach(pos => {
    if (teamA.position_counts[pos] !== undefined) {
      teamA.position_counts[pos]--;
    }
    if (teamB.position_counts[pos] !== undefined) {
      teamB.position_counts[pos]++;
    }
  });
  playerB.positions?.forEach(pos => {
    if (teamB.position_counts[pos] !== undefined) {
      teamB.position_counts[pos]--;
    }
    if (teamA.position_counts[pos] !== undefined) {
      teamA.position_counts[pos]++;
    }
  });
}

// Phase 4: Optimize team balance through iterative swaps (rating + position)
function optimizeTeamsWithSwaps(teams, preAssignedPlayerIds, friendGroupPlayerIds, positionTargets, hasAnyGK) {
  const ACCEPTABLE_DEVIATION = 0.5;
  const MAX_ITERATIONS = 200;
  
  const getAverage = () =>
    teams.reduce((sum, t) => sum + t.total_rating, 0) / teams.length;
  const LOSS_A = 1.0; // rating deviation weight
  const LOSS_B = 1.1; // position penalty weight

  let average = getAverage();
  let improved = true;
  let iterations = 0;
  
  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;

    const currentAverage = getAverage();
    const currentDeviation = teams.reduce((sum, t) => 
      sum + Math.abs(t.total_rating - currentAverage), 0
    );
    
    // Early exit if already excellent balance
    if (currentDeviation < ACCEPTABLE_DEVIATION * teams.length) {
      break;
    }

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const teamA = teams[i];
        const teamB = teams[j];

        const swappableA = teamA.players.filter(p => 
          !preAssignedPlayerIds.has(p.id) && 
          !friendGroupPlayerIds.has(p.id) && 
          !p.is_unknown
        );
        const swappableB = teamB.players.filter(p => 
          !preAssignedPlayerIds.has(p.id) && 
          !friendGroupPlayerIds.has(p.id) && 
          !p.is_unknown
        );

        if (swappableA.length === 0 || swappableB.length === 0) continue;

        for (const playerA of swappableA) {
          for (const playerB of swappableB) {
            const newTotalA = teamA.total_rating - playerA.skill_rating + playerB.skill_rating;
            const newTotalB = teamB.total_rating - playerB.skill_rating + playerA.skill_rating;

            const oldDiff = Math.abs(teamA.total_rating - average) + Math.abs(teamB.total_rating - average);
            const newDiff = Math.abs(newTotalA - average) + Math.abs(newTotalB - average);

            // Position penalties before and after
            const oldPosPenalty = teamPositionPenalty(teamA, positionTargets, !hasAnyGK) + teamPositionPenalty(teamB, positionTargets, !hasAnyGK);

            const simulatePenalty = (team, outPlayer, inPlayer) => {
              const counts = { ...team.position_counts };
              (outPlayer.positions || []).forEach(pos => {
                if (counts[pos] !== undefined) counts[pos]--;
              });
              (inPlayer.positions || []).forEach(pos => {
                if (counts[pos] !== undefined) counts[pos]++;
              });
              const tempTeam = { ...team, position_counts: counts };
              return teamPositionPenalty(tempTeam, positionTargets, !hasAnyGK);
            };

            const newPosPenalty =
              simulatePenalty(teamA, playerA, playerB) + simulatePenalty(teamB, playerB, playerA);

            const oldLoss = LOSS_A * oldDiff + LOSS_B * oldPosPenalty;
            const newLoss = LOSS_A * newDiff + LOSS_B * newPosPenalty;

            if (newLoss < oldLoss) {
              // Update position counts for the swap
              updatePositionCountsForSwap(playerA, playerB, teamA, teamB);

              // Perform the swap
              teamA.players = teamA.players.map(p => p.id === playerA.id ? playerB : p);
              teamB.players = teamB.players.map(p => p.id === playerB.id ? playerA : p);
              teamA.total_rating = newTotalA;
              teamB.total_rating = newTotalB;
              improved = true;
            }
          }
        }
      }
    }
  }
}

// Phase 5: Distribute unknown players strategically by positional deficits
function distributeUnknownPlayers(teams, unknownPlayers, playersPerTeam, positionTargets, scarcity, defaultRating, hasAnyGK) {
  unknownPlayers.forEach(player => {
    const teamsWithSpace = teams.filter(t => t.players.length < playersPerTeam);
    if (teamsWithSpace.length === 0) {
      console.warn(`Cannot assign unknown player ${player.name} - all teams are full`);
      return;
    }
    const average = teams.reduce((s, t) => s + t.total_rating, 0) / Math.max(1, teams.length);

    let bestTeam = null;
    let bestScore = -Infinity;
    const hasPositions = (player.positions || []).length > 0;

    teamsWithSpace.forEach(team => {
      let score;
      if (hasPositions) {
        score = scoreAssignment({ team, player, average, targets: positionTargets, scarcity });
      } else {
        // No positions known: pick the team with highest positional penalty (needs)
        score = teamPositionPenalty(team, positionTargets, !hasAnyGK) + (1 - (team.players.length / Math.max(1, playersPerTeam))) * 0.1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestTeam = team;
      }
    });
    if (bestTeam) {
      addPlayerToTeam(bestTeam, player, defaultRating);
    }
  });
}

// Validate formation compatibility and log warnings
function validateFormation(teams, formation, playersPerTeam) {
  const formationParts = formation.split('-').map(Number).filter(n => !isNaN(n));
  const totalFieldPlayers = formationParts.reduce((sum, num) => sum + num, 0);
  const hasGK = playersPerTeam > totalFieldPlayers;
  
  teams.forEach((team) => {
    // Check for goalkeeper
    if (hasGK && team.position_counts.goalkeeper === 0) {
      console.warn(`${team.team_name} has no goalkeeper - consider adding one for formation ${formation}`);
    }
    
    // Check for defenders (first number in formation)
    if (formationParts.length > 0 && team.position_counts.defender + team.position_counts.cb < Math.ceil(formationParts[0] / 2)) {
      console.warn(`${team.team_name} may lack defenders for formation ${formation}`);
    }
    
    // CB minimum if defenders >= 2 (choice 2.b)
    const defendersNeeded = formationParts[0] || 0;
    if (defendersNeeded >= 2 && team.position_counts.cb === 0) {
      console.warn(`${team.team_name} has no center backs (CB) but formation ${formation} requires at least 1`);
    }
    
    // Check for midfielders (middle numbers)
    const midfielderNeed = formationParts.length > 1 ? formationParts[1] : 0;
    if (midfielderNeed > 0 && team.position_counts.midfielder === 0) {
      console.warn(`${team.team_name} has no midfielders for formation ${formation}`);
    }
    
    // Check for strikers (last number in formation)
    const strikerNeed = formationParts.length > 2 ? formationParts[formationParts.length - 1] : 0;
    if (strikerNeed > 0 && team.position_counts.striker === 0) {
      console.warn(`${team.team_name} has no strikers for formation ${formation}`);
    }
  });
}

// Main function: Generate balanced teams
export function generateBalancedTeams(
  attendingPlayers, 
  teamsCount, 
  playersPerTeam, 
  preAssignedTeams, 
  friendRestrictions = [], 
  maxStars = 7, 
  formation = '3-2-1'
) {
  const defaultRating = Math.ceil(maxStars / 2);
  const positionTargets = derivePositionTargets(formation, playersPerTeam);
  const scarcity = computeScarcity(attendingPlayers);
  const hasAnyGK = attendingPlayers.some(p => (p.positions || []).includes('goalkeeper'));
  
  // Initialize teams
  const teams = initializeTeams(teamsCount);

  // Phase 1: Assign pre-assigned players
  const preAssignedPlayerIds = assignPreAssignedPlayers(
    teams, 
    attendingPlayers, 
    preAssignedTeams, 
    defaultRating
  );

  // Phase 2: Assign friend groups
  const friendGroupPlayerIds = assignFriendGroups(
    teams, 
    attendingPlayers, 
    friendRestrictions, 
    preAssignedPlayerIds, 
    playersPerTeam, 
    teamsCount, 
    defaultRating,
    positionTargets,
    scarcity
  );

  // Separate remaining players into known and unknown
  const remainingPlayers = attendingPlayers.filter(p => 
    !preAssignedPlayerIds.has(p.id) && !friendGroupPlayerIds.has(p.id)
  );
  const knownPlayers = remainingPlayers.filter(p => !p.is_unknown);
  const unknownPlayers = remainingPlayers.filter(p => p.is_unknown);

  // Phase 3: Distribute known players using position-first rounds
  distributeKnownPlayers(teams, knownPlayers, playersPerTeam, defaultRating, positionTargets, scarcity);

  // Phase 4: Optimize teams with swaps (balance first, then positions)
  optimizeTeamsWithSwaps(teams, preAssignedPlayerIds, friendGroupPlayerIds, positionTargets, hasAnyGK);

  // Phase 5: Distribute unknown players strategically
  distributeUnknownPlayers(teams, unknownPlayers, playersPerTeam, positionTargets, scarcity, defaultRating, hasAnyGK);

  // Validate formation compatibility and log warnings
  validateFormation(teams, formation, playersPerTeam);

  return teams;
}