export default function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo"],
    ],
    plugins: [
      // Add any additional plugins if needed
    ],
  };
};