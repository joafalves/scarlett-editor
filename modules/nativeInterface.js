const dialog = require('electron').dialog;
const pjson = require('../package.json');
const fs = require('fs');
const fse = require('fs-extra');
const pathUtils = require('path');
const ncp = require('copy-paste');

function NativeInterface() {
}

function getOpenCommandLine() {
    switch (process.platform) {
        case 'darwin' :
            return 'open';
        case 'win32' :
            return '';
        case 'win64' :
            return '';
        default :
            return 'xdg-open';
    }
}

NativeInterface.getSystemDirectorySlash = function () {
    switch (process.platform) {
        case 'win32' :
        case 'win64':
            return "\\";
        default:
            return "/";
    }
};

NativeInterface.rename = function (oldPath, newPath, callback) {
    fs.rename(oldPath, newPath, callback);
};

NativeInterface.removeDirectory = function (path, callback) {
    fs.rmdir(path, callback);
};

NativeInterface.removeFile = function (path, callback) {
    fs.unlink(path, callback);
};

NativeInterface.createDirectory = function (path, callback) {
    fse.mkdirs(path, callback);
};

NativeInterface.copy = function (text, callback) {
    ncp.copy(text, callback);
};

NativeInterface.paste = function (callback) {
    ncp.paste(callback);
};

NativeInterface.saveFileDialog = function (defaultPath, params, callback) {
    params = params || {};
    params.filters = params.filters || {};
    dialog.showSaveDialog({
        defaultPath: defaultPath,
        filters: params.filters
    }, function (result) {
        if (result && result.length > 0) {
            callback(result);
        } else {
            callback(false);
        }
    })
};

NativeInterface.openFileBrowser = function (defaultPath, params, callback) {
    params = params || {};
    params.filters = params.filters || {};
    dialog.showOpenDialog({
        properties: ['openFile'],
        defaultPath: defaultPath,
        filters: params.filters
    }, function (result) {
        if (result && result.length > 0) {
            callback(result[0]);
        } else {
            callback(false);
        }
    })
};

NativeInterface.openDirectoryBrowser = function (defaultPath, resultCallback) {
    dialog.showOpenDialog({defaultPath: defaultPath, properties: ['openDirectory']}, function (result) {
        if (result && result.length > 0) {
            resultCallback(result[0]);
        } else {
            resultCallback(false);
        }
    })
};

NativeInterface.openFile = function (path) {
    let cmd = getOpenCommandLine();
    let exec = require('child_process').exec;
    exec(cmd + " \"" + path + "\"");
};

NativeInterface.mapDirectory = function (path, originalPath) {
    if (path[path.length - 1] == "\\" || path[path.length - 1] == "/") {
        path = path.substring(0, path.length - 1);
    }

    let directoryModel = {
        path: path,
        subdirectories: [],
        files: []
    };

    if (!originalPath) {
        originalPath = path;
    }

    fs.readdir(path, function (err, list) {
        if (err) return directoryModel;
        list.forEach(function (_path) {
            let fullpath = pathUtils.resolve(path, _path);
            fs.stat(fullpath, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    directoryModel.subdirectories.push(NativeInterface.mapDirectory(fullpath, originalPath));
                } else {
                    directoryModel.files.push({
                        relativePath: fullpath.substring(originalPath.length + 1, fullpath.length), // +1 because of the bar
                        fullPath: fullpath
                    });
                }
            })
        });
    });

    return directoryModel;
};

NativeInterface.copyFile = function (source, target, callback) {
    fse.copy(source, target, function (err) {
        if (err) return callback(err);
        callback();
    });
};

NativeInterface.writeFile = function (path, content, callback) {
    fs.writeFile(path, content, function (err) {
        if (err) {
            console.log(err);
        }

        if (callback) {
            callback(err ? false : true);
        }
    });
};

/**
 *
 * @param fileMap [{path: "file_path", content: "..."}, ...]
 * @param callback
 */
NativeInterface.writeFiles = function(fileMap, callback) {
	let writeCount = 0;
	let writeLength = fileMap.length;
	let writeHealthy = true;
	let writeCompleted = (status) => {
	    if (!status) {
	        // just one failure is enough to make the operation "unhealthy"
		    writeHealthy = false;
        }

        writeCount++;
	    if (writeCount >= writeLength) {
	        callback(writeHealthy);
        }
	};

    fileMap.forEach(function (item) {
	    // this seems to be "valid"?
	    if (item.hasOwnProperty("path") && item.hasOwnProperty("content")) {
	        NativeInterface.writeFile(item.path, item.content, (status) => {
	            writeCompleted(status);
            });

	    } else {
	        writeCompleted(false);
        }
    });
};

NativeInterface.readFile = function (path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (err) {
            callback(false);
            return;
        }
        callback(data);
    });
};

/**
 *
 * @param fileMap [{id: "load_id", path: "file_path"}, ...]
 * @param callback
 */
NativeInterface.readFiles = function(fileMap, callback) {
    let readCount = 0;
    let readLength = fileMap.length;
    let readMap = {};
    let readCompleted = () => {
        readCount++;
        if (readCount >= readLength) {
            callback(readMap);
        }
    };

    fileMap.forEach(function(item) {
        // is this "valid" to try being loaded?
        if (item.hasOwnProperty("path") && item.hasOwnProperty("id")) {
            NativeInterface.readFile(item.path, (data) => {
                // either it was read or invalid, data = null when fails to read..
                readMap[item.id] = data === false ? null : data;
                readCompleted();
            });

        } else {
            readCompleted();
        }
    });
};

NativeInterface.pathExists = function (path) {
    return fs.existsSync(path);
};

module.exports = NativeInterface;