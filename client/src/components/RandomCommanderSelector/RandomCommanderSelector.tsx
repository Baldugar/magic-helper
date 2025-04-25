import { ExpandMore } from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Button, Grid, Typography } from '@mui/material'
import { useState } from 'react'
import { MTG_Card } from '../../graphql/types'

const RandomCommanderSelector = (): JSX.Element => {
    const cards: MTG_Card[] = []
    const [selectedCommander, setSelectedCommander] = useState<MTG_Card>()

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
