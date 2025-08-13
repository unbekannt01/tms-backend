const UAParser = require("ua-parser-js")

const parseDeviceInfo = (userAgent, ip) => {
  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  return {
    userAgent,
    ip,
    browser: `${result.browser.name} ${result.browser.version}`,
    os: `${result.os.name} ${result.os.version}`,
  }
}

module.exports = {
  parseDeviceInfo,
}
