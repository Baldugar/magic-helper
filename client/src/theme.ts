import { red } from '@mui/material/colors'
import { createTheme } from '@mui/material/styles'

// A custom theme for this app
const theme = createTheme({
    palette: {
        // mode: 'dark',
        primary: {
            main: '#9eaadf',
        },
        secondary: {
            main: '#c1c1c1',
        },
        error: {
            main: red.A400,
        },
    },
})

export default theme
