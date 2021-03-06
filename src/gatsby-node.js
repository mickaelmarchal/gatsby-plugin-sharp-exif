import { read } from 'fast-exif';

function convertDMSToDD(dms, positiveDirection) {
  const factor = 60;
  const res = dms
    .map((item, i) => {
      const divisor = factor * i;
      return divisor === 0 ? item : item / divisor;
    })
    .reduce((a, b) => a + b);
  return positiveDirection ? res : -res;
}

export function onCreateNode({ node, getNode, actions }) {
  const { createNodeField } = actions;
  if (node.internal.type === 'ImageSharp') {
    const parent = getNode(node.parent);

    read(parent.absolutePath)
      .then(exifData => {
        if (!exifData) {
          console.warn(`Could not read exif of ${parent.absolutePath}`);
          return;
        }

        const gps = { longitude: null, latitude: null };
        if (
          exifData.gps &&
          exifData.gps.GPSLongitude &&
          exifData.gps.GPSLatitude
        ) {
          gps.longitude = convertDMSToDD(
            exifData.gps.GPSLongitude,
            exifData.gps.GPSLongitudeRef === 'E'
          );
          gps.latitude = convertDMSToDD(
            exifData.gps.GPSLatitude,
            exifData.gps.GPSLatitudeRef === 'N'
          );
        }

        createNodeField({
          node,
          name: 'exif',
          value: {
            gps,
            meta: {
              dateTaken: exifData.exif && exifData.exif.DateTimeOriginal
            },
            raw: exifData
          }
        });
      })
      .catch(err => console.error(err));
  }
}
