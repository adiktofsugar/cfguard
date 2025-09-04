import Logger from "js-logger";

const availableLogLevels = [
    Logger.TRACE,
    Logger.DEBUG,
    Logger.INFO,
    Logger.WARN,
    Logger.ERROR,
    Logger.OFF,
] as const;

export function setupLogger(env: Env) {
    const logLevel =
        availableLogLevels.find((l) => l.name === env.LOG_LEVEL?.toUpperCase()) || Logger.INFO;

    Logger.useDefaults({
        defaultLevel: logLevel,
        formatter: (messages, context) => {
            const timestamp = new Date().toISOString();
            const level = context.level.name;
            messages.unshift(`[${timestamp}] [${level}]`);
        },
    });
}
