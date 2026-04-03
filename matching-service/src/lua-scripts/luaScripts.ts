// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = queued state JSON string
const LUA_ENQUEUE_IF_ABSENT = `
  if redis.call('HEXISTS', KEYS[1], ARGV[1]) == 1 then
    return 0
  end

  redis.call('RPUSH', KEYS[2], ARGV[1])
  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('SADD', KEYS[3], KEYS[2])
  return 1
`;


// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = snapshot of queued state JSON string
const LUA_CLEANUP_TIMEOUT_IF_QUEUED = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  -- Snapshot mismatch means the state changed after HGETALL and should be ignored.
  if currentState ~= ARGV[2] then
    return 0
  end

  -- Remove user from queue and remove queue if no users left
  local removed = redis.call('LREM', KEYS[2], 0, ARGV[1])
  if removed > 0 then
    redis.call('HDEL', KEYS[1], ARGV[1])
    if redis.call('LLEN', KEYS[2]) == 0 then
      redis.call('SREM', KEYS[3], KEYS[2])
    end
    return 1
  end

  -- User was no longer in queue (likely already dequeued for match); clear stale hash only.
  redis.call('HDEL', KEYS[1], ARGV[1])

  if redis.call('LLEN', KEYS[2]) == 0 then
    redis.call('SREM', KEYS[3], KEYS[2])
  end
  return -1
`;

// KEYS[1] = queued users hash key
// KEYS[2] = queue list key
// KEYS[3] = active queues set key
// ARGV[1] = user ID
// ARGV[2] = snapshot of queued state JSON string
const LUA_CANCEL_IF_QUEUED = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  if currentState ~= ARGV[2] then
    return 0
  end

  local removed = redis.call('LREM', KEYS[2], 0, ARGV[1])
  if removed > 0 then
    redis.call('HDEL', KEYS[1], ARGV[1])
    if redis.call('LLEN', KEYS[2]) == 0 then
      redis.call('SREM', KEYS[3], KEYS[2])
    end
    return 1
  end

  redis.call('HDEL', KEYS[1], ARGV[1])

  -- If no users are left in the queue, remove the queue from active.queues set
  if redis.call('LLEN', KEYS[2]) == 0 then
    redis.call('SREM', KEYS[3], KEYS[2])
  end
  return -1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = pending match ID
// ARGV[2] = pending match state JSON string
// ARGV[3] = user1 ID
// ARGV[4] = user2 ID
const LUA_CREATE_PENDING_MATCH = `
  if redis.call('HEXISTS', KEYS[2], ARGV[3]) == 1 or redis.call('HEXISTS', KEYS[2], ARGV[4]) == 1 then
    return 0
  end

  redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
  redis.call('HSET', KEYS[2], ARGV[3], ARGV[1])
  redis.call('HSET', KEYS[2], ARGV[4], ARGV[1])
  return 1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = user ID
// ARGV[2] = pending match ID
// it checks if the user has a pending match mapping in users.pending.match hash, if it matches the provided pending match ID, and if so marks that user as accepted in the pending match state.
// Returns:
//   0 if no pending match found
//  -1 if pending match ID mismatch
//  -2 if user is not part of the pending match
//  1 if accept recorded but still waiting for other user
//  2 if both users have accepted.
const LUA_ACCEPT_PENDING_MATCH = `
  local mappedPendingMatchId = redis.call('HGET', KEYS[2], ARGV[1])
  if not mappedPendingMatchId then
    return 0
  end

  if mappedPendingMatchId ~= ARGV[2] then
    return -1
  end

  local currentState = redis.call('HGET', KEYS[1], ARGV[2])
  if not currentState then
    redis.call('HDEL', KEYS[2], ARGV[1])
    return 0
  end

  local ok, state = pcall(cjson.decode, currentState)
  if not ok then
    redis.call('HDEL', KEYS[1], ARGV[2])
    redis.call('HDEL', KEYS[2], ARGV[1])
    return 0
  end

  if ARGV[1] == state.user1Id then
    state.acceptedByUser1 = true
  elseif ARGV[1] == state.user2Id then
    state.acceptedByUser2 = true
  else
    return -2
  end

  redis.call('HSET', KEYS[1], ARGV[2], cjson.encode(state))

  if state.acceptedByUser1 and state.acceptedByUser2 then
    return 2
  end

  return 1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = pending match ID
// ARGV[2] = snapshot of pending match state JSON string
const LUA_FINALIZE_PENDING_MATCH = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  if currentState ~= ARGV[2] then
    return -1
  end

  local ok, state = pcall(cjson.decode, currentState)
  if not ok then
    redis.call('HDEL', KEYS[1], ARGV[1])
    return 0
  end

  redis.call('HDEL', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[2], state.user1Id)
  redis.call('HDEL', KEYS[2], state.user2Id)
  return 1
`;

// KEYS[1] = pending matches hash key
// KEYS[2] = user -> pending match hash key
// ARGV[1] = pending match ID
// ARGV[2] = snapshot of pending match state JSON string
const LUA_EXPIRE_PENDING_MATCH_IF_UNCHANGED = `
  local currentState = redis.call('HGET', KEYS[1], ARGV[1])
  if not currentState then
    return 0
  end

  if currentState ~= ARGV[2] then
    return -1
  end

  local ok, state = pcall(cjson.decode, currentState)
  if not ok then
    redis.call('HDEL', KEYS[1], ARGV[1])
    return 0
  end

  redis.call('HDEL', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[2], state.user1Id)
  redis.call('HDEL', KEYS[2], state.user2Id)
  return 1
`;

export {
    LUA_ENQUEUE_IF_ABSENT,
    LUA_CLEANUP_TIMEOUT_IF_QUEUED,
    LUA_CANCEL_IF_QUEUED,
    LUA_CREATE_PENDING_MATCH,
    LUA_ACCEPT_PENDING_MATCH,
    LUA_FINALIZE_PENDING_MATCH,
    LUA_EXPIRE_PENDING_MATCH_IF_UNCHANGED,
};