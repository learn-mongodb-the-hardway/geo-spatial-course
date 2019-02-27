function waitOneTick() {
  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      resolve();
    })
  });
}

module.exports = { waitOneTick };