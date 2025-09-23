import { Box, ButtonBase, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, Tab, Tabs, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useMTGCardPackages } from '../../../context/MTGA/CardPackages/useCardPackages'
import { MTG_CardPackage } from '../../../graphql/types'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import PackageCard from './PackageCard'

export const PackagesDialog = () => {
    const { openImportCardPackageDialog, setOpenImportCardPackageDialog, importCardPackage } = useMTGDeckCreator()
    const { cardPackages, publicCardPackages, loading, setCardPackageVisibility } = useMTGCardPackages()
    const [tab, setTab] = useState<'mine' | 'public'>('mine')

    const handleVisibilityToggle = useCallback(
        (pkg: MTG_CardPackage, nextValue: boolean) => setCardPackageVisibility(pkg.ID, nextValue),
        [setCardPackageVisibility],
    )

    const packagesToDisplay = tab === 'mine' ? cardPackages : publicCardPackages

    return (
        <Dialog open={openImportCardPackageDialog} onClose={() => setOpenImportCardPackageDialog(false)}>
            <DialogTitle>Import Card Package</DialogTitle>
            <DialogContent sx={{ minWidth: 420 }}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                    <Tab label={`My Packages (${cardPackages.length})`} value='mine' />
                    <Tab label={`Public Packages (${publicCardPackages.length})`} value='public' />
                </Tabs>
                {loading ? (
                    <Box display='flex' justifyContent='center' alignItems='center' minHeight={200}>
                        <CircularProgress size={32} />
                    </Box>
                ) : packagesToDisplay.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                        {tab === 'mine'
                            ? 'You have no saved packages yet.'
                            : 'No public packages available.'}
                    </Typography>
                ) : (
                    <Grid container spacing={2}>
                        {packagesToDisplay.map((cardPackage) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={cardPackage.ID}>
                                <ButtonBase
                                    key={cardPackage.ID}
                                    onClick={() => {
                                        setOpenImportCardPackageDialog(false)
                                        importCardPackage(cardPackage)
                                    }}
                                >
                                    <PackageCard
                                        cardPackage={cardPackage}
                                        onToggleVisibility={tab === 'mine' ? handleVisibilityToggle : undefined}
                                    />
                                </ButtonBase>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </DialogContent>
        </Dialog>
    )
}
