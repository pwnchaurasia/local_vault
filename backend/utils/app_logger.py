import asyncio
import os
import pathlib
import logging
import logging.config
import sys
import traceback
from functools import wraps
from datetime import datetime, timezone


BASE_DIR = pathlib.Path(".").parent.absolute()
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters":{
        "verbose": {"format": "%(asctime)s %(levelname)s %(filename)s:%(lineno)d  %(message)s"},
        "simple": {"format": "%(levelname)s %(message)s"}
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "app": {
            "level": "DEBUG",
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "verbose",
            "filename": os.path.join(LOG_DIR, "app.log"),
            "when": "W4",
            "interval": 1,
            "backupCount": 7,
        },
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False
        },
        "app":{
            "handlers": ["app"],
            "level": "DEBUG",
            "propagate": False
        },
    },
}


logging.config.dictConfig(config=LOGGING_CONFIG)

def createLogger(logHandler):
    logger = logging.getLogger(logHandler)
    # logger = setLoggerLevel(logger,settings.APP_LOGGING_LEVEL)
    return logger


def setLoggerLevel(logger, loglevel):
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARN": logging.WARN,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    logger.setLevel(level_map.get(loglevel, logging.INFO))
    return logger


# Logging decorator for function entry/exit logs
def functionlogs(log="app"):
    def wrap(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(log)
            init_time = datetime.now(timezone.utc)
            func_str = "{}.{}".format(function.__module__, function.__qualname__)
            try:
                response = function(*args, **kwargs)
            except Exception as error:
                log_enter_text = "[local_vault][{0}][ENTER] with input={1} kwargs={2}".format(
                    func_str, args, kwargs)
                logger.debug(log_enter_text)

                log_error_text = "[local_vault][{0}][ERROR] error={1}".format(func_str, str(error))
                logger.error(log_error_text)
                raise error

            end_time = datetime.now(timezone.utc)
            time_taken = end_time - init_time
            try:
                log_enter_text = "[local_vault][{0}][ENTER] with input={1} kwargs={2}".format(
                    func_str, args, kwargs
                )
                logger.debug(log_enter_text)
                log_exit_text = "[local_vault][{0}][EXIT] response={1} in {2} seconds".format(
                    func_str, response, time_taken)
                logger.debug(log_exit_text)
            except:
                pass

            return response
        return wrapper
    return wrap


# Exception logging function
def exceptionlogs(e, log="app"):
    logger = logging.getLogger(log)
    log_error_text = f"Error Line: {sys.exc_info()[2].tb_lineno} {e} {sys.exc_info()[2].tb_frame.f_code.co_filename}"
    logger.error(log_error_text)
    logger.error(traceback.format_exc())