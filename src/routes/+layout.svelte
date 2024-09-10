<script lang="ts">
    import {ThemeProvider} from "nunui";
    import './layout.css'

    let {
        children
    } = $props();
</script>

<ThemeProvider {children} />
