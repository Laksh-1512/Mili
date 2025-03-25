const isBase64 = (str) => {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (err) {
    return false;
  }
};

module.exports = {
  isBase64
}; 