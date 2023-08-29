const fileList = [
  /META-INF[\\/].*\.txt$/,
];

function file(path: string) {
  return fileList.some(e => e.test(path));
}

export default {
  file
};