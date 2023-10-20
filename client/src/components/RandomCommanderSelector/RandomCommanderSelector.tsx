import { ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Button, Grid, Typography } from '@mui/material'
import { useContext, useState } from 'react'
import CardsContext from '../../hooks/cardsContext'

const RandomCommanderSelector = (): JSX.Element => {
    const cards = useContext(CardsContext).filter((c) => c.type_line.includes('Legendary Creature'))
    const [selectedCommander, setSelectedCommander] = useState<any>(undefined)

    const calculateRandomCommander = () => {
        const random = Math.floor(Math.random() * cards.length)
        const commander = cards[random]
        return commander
    }

    const onClickRandomize = () => {
        const commander = calculateRandomCommander()
        setSelectedCommander(commander)
    }

    return (
        <Grid xs={12} container direction={'column'}>
            <Grid item xs={'auto'}>
                <Button onClick={onClickRandomize}>Randomize</Button>
            </Grid>
            <Grid item xs={'auto'}>
                <Typography variant={'h4'}>Commander</Typography>
            </Grid>
            <Grid item xs>
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>Commander</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography
                            maxWidth={1}
                            sx={{
                                wordBreak: 'break-all',
                            }}
                        >
                            {JSON.stringify(selectedCommander)}
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            </Grid>
        </Grid>
    )
}

export default RandomCommanderSelector
