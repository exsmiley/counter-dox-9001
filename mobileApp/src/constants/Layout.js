import { Dimensions } from 'react-native';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

export default {
  window: { width, height },
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 414,
  isLargeDevice: width >= 414,
  tokenSize: Math.min(width * 0.12, 56),
  circleRadius: Math.min(width, height) * 0.35,
};
