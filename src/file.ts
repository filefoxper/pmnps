import fs from 'fs';
import path from 'path';

const actualRootPath = process.cwd();

const rootPath =
  process.env.NODE_ENV === 'development'
    ? path.join(actualRootPath, 'test')
    : actualRootPath;

function mkdir(dirPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
}

async function readdir(dirPath: string): Promise<string[]> {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(files);
    });
  });
}

async function mkdirIfNotExist(dirPath: string) {
  const isDir = await isDirectory(dirPath);
  if (!isDir) {
    return mkdir(dirPath);
  }
}

function readJsonAsync<T extends Record<string, any>>(locationPath: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fs.readFile(locationPath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const content = data.toString('utf-8');
      if(!content.trim()){
        resolve({} as T);
        return;
      }
      resolve(JSON.parse(content));
    });
  });
}

function readFileAsync(locationPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(locationPath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const content = data.toString('utf-8');
      resolve(content);
    });
  });
}

function writeFileAsync(locationPath: string, data: string) {
  return new Promise((resolve, reject) => {
    fs.writeFile(locationPath, data, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

function writeJsonAsync(locationPath: string, json: Record<string, any>) {
  return writeFileAsync(locationPath, JSON.stringify(json));
}

async function createFile(filePath: string, content: string = '') {
  return writeFileAsync(filePath, content);
}

async function createFileIfNotExist(filePath: string, content: string = '') {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return createFile(filePath, content);
  }
}

async function createFileIntoDirIfNotExist(
  dirPath: string,
  filename: string,
  ends?: string[]
) {
  const [name] = filename.split('.');
  const allNotExist = (ends || []).every(
    end => !fs.existsSync(path.join(dirPath, `${name}.${end}`))
  );
  if (!fs.existsSync(path.join(dirPath, filename)) && allNotExist) {
    return createFile(path.join(dirPath, filename));
  }
}

function copyFolder(sourceDirPath: string, targetDirPath: string) {
  return new Promise((resolve, reject) => {
    fs.cp(
      sourceDirPath,
      targetDirPath,
      { recursive: true, force: false },
      err => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      }
    );
  });
}

function isFile(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)){
      resolve(false);
      return;
    }
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stats.isFile());
    });
  });
}

function isDirectory(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)){
      resolve(false);
      return;
    }
    fs.stat(filePath, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stats.isDirectory());
    });
  });
}

async function unlink(filePath: string): Promise<boolean> {
  const file = await isFile(filePath);
  if (!file) {
    return false;
  }
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
}

export {
  readdir,
  mkdir,
  mkdirIfNotExist,
  readFileAsync,
  writeFileAsync,
  readJsonAsync,
  writeJsonAsync,
  createFile,
  createFileIfNotExist,
  createFileIntoDirIfNotExist,
  copyFolder,
  unlink,
  isFile,
  isDirectory,
  rootPath
};
