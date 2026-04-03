module.exports = {
    extends: ["../.eslintrc.config.js"],
    parserOptions: {
        project: './tsconfig.json',
    },
    env: {
        node: true
    },
};