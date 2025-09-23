import { Box, Button, FormControlLabel, Grid, Paper, Popover, Stack, Switch, TextField, Typography } from '@mui/material'
import { useCallback, useContext, useState } from 'react'
import MTGCardPackage from '../../../../components/deckBuilder/PackagesDialog/PackageCard'
import { MTG_CardPackage } from '../../../../graphql/types'
import { MTGCardPackagesContext } from '../../../../context/MTGA/CardPackages/CardPackagesContext'

/**
 * CardPackageList shows the dashboard section for Card Packages.
 *
 * Includes
 * - Create button with popover form
 * - Responsive grid of package summaries
 */
export const CardPackageList = () => {
    // Card Packages: creation UI and list
    const { cardPackages, createCardPackage, setCardPackageVisibility } = useContext(MTGCardPackagesContext)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [name, setName] = useState('')
    const [isPublic, setIsPublic] = useState(false)

    const handleToggleVisibility = useCallback(
        (pkg: MTG_CardPackage, nextValue: boolean) => setCardPackageVisibility(pkg.ID, nextValue),
        [setCardPackageVisibility],
    )

    /** Open the create card package popover. */
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    /** Close the popover and reset input. */
    const handleClose = () => {
        setAnchorEl(null)
        setName('')
        setIsPublic(false)
    }

    const open = Boolean(anchorEl)

    return (
        <Stack padding={4} gap={2}>
            {/* Header bar with title and create card package action */}
            <Stack justifyContent={'flex-start'} direction={'row'} spacing={4}>
                <Typography variant={'h4'}>Card Packages</Typography>
                <Button variant={'contained'} color={'secondary'} onClick={handleClick}>
                    Create Card Package
                </Button>
                {/* Create Card Package popover form */}
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
                        {/* Name input for new card package */}
                        <TextField
                            fullWidth
                            variant={'filled'}
                            label={'Name'}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isPublic}
                                    onChange={(event) => setIsPublic(event.target.checked)}
                                    color='primary'
                                />
                            }
                            label='Make public'
                            sx={{ mt: 2 }}
                        />
                        <Box display={'flex'} justifyContent={'flex-end'} marginTop={2}>
                            <Button
                                variant={'contained'}
                                color={'primary'}
                                disabled={name.length === 0}
                                onClick={async () => {
                                    await createCardPackage(name, { isPublic })
                                    handleClose()
                                }}
                            >
                                Create
                            </Button>
                        </Box>
                    </Paper>
                </Popover>
            </Stack>
            {/* Responsive grid of card package summaries */}
            <Grid container columnSpacing={4}>
                {cardPackages.map((cardPackage) => (
                    <Grid item xs={'auto'} key={cardPackage.ID} container justifyContent={'center'}>
                        <MTGCardPackage cardPackage={cardPackage} onToggleVisibility={handleToggleVisibility} />
                    </Grid>
                ))}
            </Grid>
        </Stack>
    )
}
