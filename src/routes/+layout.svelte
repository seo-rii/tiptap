<script lang="ts">
    import {ThemeProvider} from "nunui";
</script>

<ThemeProvider>
    <slot/>
</ThemeProvider>

<style lang="scss">
  :global {

    @font-face {
      font-family: 'Spoqa Han Sans Neo';
      font-weight: 700;
      src: local('Spoqa Han Sans Neo Bold'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.woff2') format('woff2'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.woff') format('woff'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Bold.ttf') format('truetype');
    }


    @font-face {
      font-family: 'Spoqa Han Sans Neo';
      font-weight: 500;
      src: local('Spoqa Han Sans Neo Medium'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Medium.woff2') format('woff2'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Medium.woff') format('woff'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Medium.ttf') format('truetype');
    }

    @font-face {
      font-family: 'Spoqa Han Sans Neo';
      font-weight: 400;
      src: local('Spoqa Han Sans Neo Regular'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.woff2') format('woff2'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.woff') format('woff'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Regular.ttf') format('truetype');
    }

    @font-face {
      font-family: 'Spoqa Han Sans Neo';
      font-weight: 300;
      src: local('Spoqa Han Sans Neo Light'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Light.woff2') format('woff2'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Light.woff') format('woff'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Light.ttf') format('truetype');
    }

    @font-face {
      font-family: 'Spoqa Han Sans Neo';
      font-weight: 100;
      src: local('Spoqa Han Sans Neo Thin'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Thin.woff2') format('woff2'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Thin.woff') format('woff'),
      url('https://cdn.jsdelivr.net/gh/spoqa/spoqa-han-sans@latest/Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-Thin.ttf') format('truetype');
    }

    body, html, body > div, body > div > main {
      margin: 0;
      padding: 0;
      font: normal 300 16px 'Spoqa Han Sans Neo', 'sans-serif';
      height: 100%;
    }

    body > div > main {
      padding: 12px;
    }

    h1, h2 {
      font-weight: 300;
    }

    hr {
        border: 0;
        border-top: 1px solid #eee;
    }
  }
</style>
