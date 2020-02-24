import {
    NativeModules
} from 'react-native';

export const getHex = (path, x, y) => new Promise((resolve, reject) => {
    NativeModules.RNPixelColor.getHex(path, x, y, (err, color) => {
        if (err) return reject(err);
        resolve(color);
    });
});

export default {
    getHex,
}
