const { readFileSync } = require('fs');

function waitOneTick() {
  return new Promise((resolve, reject) => {
    process.nextTick(() => {
      resolve();
    })
  });
}

function readAccessToken(tokenFile) {
  var accessToken = process.env["MAPBOX_ACCESS_TOKEN"];

  if (accessToken == null) {
    accessToken = readFileSync(tokenFile, 'utf8');
  }

  return (accessToken || '').trim();
}

function doesNotContainFields(doc, fields) {
  return fields.filter(field => {
    return doc[field] == null;
  });
};

function containFields(doc, fields) {
  return fields.filter(field => {
    return doc[field] != null;
  });
};

module.exports = { waitOneTick, readAccessToken, doesNotContainFields, containFields };