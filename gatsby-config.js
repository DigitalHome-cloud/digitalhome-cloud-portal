module.exports = {
  siteMetadata: {
    title: `DigitalHome.Cloud Portal`,
    siteUrl: `https://portal.digitalhome.cloud`,
    description: `Your launchpad for designing, managing and operating smart homes.`,
    author: `D-LAB-5`
  },
  plugins: [
    // Keep or add your existing Gatsby plugins here (image, sharp, etc.)

    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `locales`,
        path: `${__dirname}/src/locales`,
      },
    },
    {
      resolve: `gatsby-plugin-react-i18next`,
      options: {
        localeJsonSourceName: `locales`,
        languages: [`en`, `de`, `fr`],
        defaultLanguage: `en`,
        siteUrl: `https://portal.digitalhome.cloud`,
        i18nextOptions: {
          fallbackLng: `en`,
          interpolation: {
            escapeValue: false,
          },
        },
      },
    },
  ],
};
