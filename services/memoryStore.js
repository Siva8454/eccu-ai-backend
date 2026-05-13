const memory = {};

function getMemory(userId) {
  return memory[userId] || {};
}

function saveMemory(userId, data) {
  memory[userId] = {
    ...memory[userId],
    ...data
  };
}

module.exports = {
  getMemory,
  saveMemory
};