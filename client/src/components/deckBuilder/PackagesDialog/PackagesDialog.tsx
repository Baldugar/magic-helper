import { ButtonBase, Dialog, DialogContent, DialogTitle, Grid } from '@mui/material'
import { useMTGCardPackages } from '../../../context/MTGA/CardPackages/useCardPackages'
import { useMTGDeckCreator } from '../../../context/MTGA/DeckCreator/useMTGDeckCreator'
import PackageCard from './PackageCard'

export const PackagesDialog = () => {
    const { openImportCardPackageDialog, setOpenImportCardPackageDialog, importCardPackage } = useMTGDeckCreator()
    const { cardPackages } = useMTGCardPackages()

    return (
        <Dialog open={openImportCardPackageDialog} onClose={() => setOpenImportCardPackageDialog(false)}>
            <DialogTitle>Import Card Package</DialogTitle>
            <DialogContent>
                <Grid container spacing={2}>
                    {cardPackages.map((cardPackage) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={cardPackage.ID}>
                            <ButtonBase
                                key={cardPackage.ID}
                                onClick={() => {
                                    setOpenImportCardPackageDialog(false)
                                    importCardPackage(cardPackage)
                                }}
                            >
                                <PackageCard cardPackage={cardPackage} />
                            </ButtonBase>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
        </Dialog>
    )
}
