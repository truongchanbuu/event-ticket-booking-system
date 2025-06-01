const { createContainer, asValue } = require('awilix');
const { createLogger } = require('../../shared/logger');

const container = createContainer();

// Logger
const loggerInstance = createLogger();

container.register({
    logger: asValue(loggerInstance),
});

export default container;
