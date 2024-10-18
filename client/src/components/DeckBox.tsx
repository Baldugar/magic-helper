import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, Card, CardMedia, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { styled } from '@mui/system'
import React from 'react'
import { Maybe } from '../graphql/types'

// Define the props that the DeckBox component will receive
interface DeckBoxProps {
    name: string // Name of the deck
    image?: Maybe<string> // URL of the deck image
    onClick: () => void // Function to handle click event on the deck box
    onDelete: () => void // Function to handle deck deletion
}

// Styled container for the deck box, adding perspective for 3D effect
const DeckBoxContainer = styled(Box)(() => ({
    perspective: '1000px', // Adds depth to create a 3D effect
    width: 250,
    height: 163,
    position: 'relative',
    // Rotate the lid when the container is hovered
    '&:hover:not(:has(.MuiIconButton-root:hover)) .DeckBoxLid': {
        transform: 'rotateX(30deg)', // Rotate the lid and slightly translate it
    },
    cursor: 'pointer', // Cursor changes to pointer to indicate it's clickable
}))

// Styled component for the lid of the deck box
const DeckBoxLid = styled(Box)(({ theme }) => ({
    width: '100%',
    height: '40%',
    backgroundColor: theme.palette.primary.main, // Use primary color from theme
    position: 'absolute',
    top: 0,
    transformOrigin: 'top', // Sets the origin for the rotation transformation
    transition: 'transform 0.3s ease-in-out', // Smooth animation when rotating the lid
    zIndex: 1, // Lid should be on top of the base
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
}))

// Styled component for the base of the deck box
const DeckBoxBase = styled(Card)(({ theme }) => ({
    width: '100%',
    height: '100%',
    backgroundColor: theme.palette.background.paper, // Use background color from theme
    position: 'absolute',
    bottom: 0,
    // transform: 'translateY(20%)', // Slightly translate the base to create a 3D effect
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)', // Manually set shadow to avoid theme type issues // Use a different shadow level that is available in the theme // Adds shadow for depth
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
}))

const DeckBox: React.FC<DeckBoxProps> = ({ name, image, onClick, onDelete }) => {
    // State to manage the anchor element for the context menu
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl) // Boolean to check if the menu is open

    // Handle opening the context menu
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget)
    }

    // Handle closing the context menu
    const handleMenuClose = () => {
        setAnchorEl(null)
    }

    // Handle deleting the deck and close the menu afterwards
    const handleDelete = () => {
        onDelete()
        handleMenuClose()
    }

    return (
        <DeckBoxContainer onClick={onClick}>
            {/* Lid of the deck box that rotates when hovered */}
            <DeckBoxLid className="DeckBoxLid">
                <Typography component="div" variant="h6">
                    {name}
                </Typography>
            </DeckBoxLid>
            {/* Base of the deck box that holds the deck details */}
            <DeckBoxBase>
                {/* Display the deck image */}
                {image && (
                    <CardMedia
                        component="img"
                        sx={{ width: 1, height: 1, objectFit: 'cover' }}
                        image={image}
                        alt={`${name} deck image`}
                    />
                )}
                {/* Context menu for deck actions */}

                {/* Button to open the context menu */}
                <IconButton
                    aria-label="more"
                    aria-controls={open ? 'deckbox-menu' : undefined}
                    aria-haspopup="true"
                    onClick={(e) => {
                        e.stopPropagation() // Prevent triggering the onClick of the deck box
                        handleMenuOpen(e)
                    }}
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                    }}
                >
                    <MoreVertIcon />
                </IconButton>
                <Menu
                    id="deckbox-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleMenuClose}
                    MenuListProps={{
                        'aria-labelledby': 'deckbox-button',
                    }}
                >
                    <MenuItem onClick={handleDelete}>Delete Deck</MenuItem>
                </Menu>
            </DeckBoxBase>
        </DeckBoxContainer>
    )
}

export default DeckBox
