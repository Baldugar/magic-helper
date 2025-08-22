import { Box, Button, Grid, Paper, Popover, Stack, TextField, Typography } from '@mui/material'
import { useContext, useState } from 'react'
import MTGCardPackage from '../../../../components/CardPackageCard'
import { MTGCardPackagesContext } from '../../../../context/MTGA/CardPackages/CardPackagesContext'

export const CardPackageList = () => {
    const { cardPackages, createCardPackage } = useContext(MTGCardPackagesContext)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [name, setName] = useState('')

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
        setName('')
    }

    const open = Boolean(anchorEl)

    return (
        <Stack padding={4} gap={2}>
            <Stack justifyContent={'flex-start'} direction={'row'} spacing={4}>
                <Typography variant={'h4'}>Card Packages</Typography>
                <Button variant={'contained'} color={'secondary'} onClick={handleClick}>
                    Create Card Package
                </Button>
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <Paper sx={{ padding: 2 }}>
                        <TextField
                            fullWidth
                            variant={'filled'}
                            label={'Name'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Box display={'flex'} justifyContent={'flex-end'} marginTop={2}>
                            <Button
                                variant={'contained'}
                                color={'primary'}
                                disabled={name.length === 0}
                                onClick={() => createCardPackage(name)}
                            >
                                Create
                            </Button>
                        </Box>
                    </Paper>
                </Popover>
            </Stack>
            <Grid container columnSpacing={4}>
                {cardPackages.map((cardPackage) => (
                    <Grid item xs={'auto'} key={cardPackage.ID} container justifyContent={'center'}>
                        <MTGCardPackage cardPackage={cardPackage} />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    )
}
