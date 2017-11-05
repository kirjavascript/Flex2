<div align="center">
    <img src="https://i.imgur.com/NrHcaGC.png" alt="flex 2">
    <br>
</div>
<br>

Flex 2 is a multi-purpose art and mapping editor for the Sega Megadrive. The original Flex was a web app, which gave it several limitations. A full rewrite for desktop opens up the ability to use real project files, as well as various other niceties.

Much inspiration has come from the tools SonMapEd, SpritePlotter, and SonikSprite - with ideas being combined and improved upon.

Because of hidden behaviour in this application, reading this document is recommended before use.


## Controls

Most of the keyboard shortcuts (and indeed, behaviours for the application) are listed on the Mappings tab at the bottom. Some commands take a multiplier, so <kbd>32</kbd> + <kbd>Up</kbd> will move the selected mappings 32 pixels up, or <kbd>8</kbd> + <kbd>n t</kbd> will add eight new tiles.

### Inputs

You can cycle through options in dropdown boxes and increase/decrease numbers in textboxes with the mouse scroll wheel. This also works for things like colour select in drawing mode. Up/Down can also be used in textboxes.

### General UI

The UI layout is fully customisable by moving or resizing tabs.

## Project Files

Project files serve as definitions for all the objects in your project. They should sit at the root of your project directory and be committed to version control. This allows quick saving and loading of data.

A key change from version 1 is that Flex no longer has a game mode. Data is saved and loaded as whatever the definition for the object says. This means you can mix formats (like S1 Mappings and S2 DPLCs for editing Sonic CD data), or even provide custom definitions.

## Mapping Editor

The mapping editor has the following mouse interactions;

| action | behaviour  |
|---|---|
| drag  | select mapping(s)  |
| double click | toggle mapping piece |
| drag (on sprite)  | move mapping(s)  |
| right drag | pan viewport |
| wheel | zoom |

### New Mapping

The new mapping overlay can be toggled with <kbd>nm</kbd>. To add a new mapping piece, drag it from the new mapping overlay to where in the mapping area you want it to display and type <kbd>nm</kbd> again to dismiss the overlay.

### Drawing Mode

When entering drawing mode by pressing <kbd>m</kbd>, dragging over the sprite will draw in the respective colour of that mouse button. If mappings overlap, both will have the colour applied.

### Raw Editor

When doing actions like deleting a mapping, Flex 2 will attempt to remove corresponding unused DPLCs. The raw editor gives you access to modify the raw data for mappings and DPLCs without performing any of these optimisations if you need it. It can also be used to change the draw order by reordering mappings.

## Palettes

Palette input will be normalised into Megadrive colours. To change the order of palette lines, you can drag the numbers to different positions.

## Sprites

The Sprites tab gives an overview of your full object's data, allowing you to change sprites or reorder them by dragging and dropping.

## Importing

When importing an image over the current frame this is no limitation on image dimensions.

For importing a spritesheet, either the alpha channel or the top left pixel color will serve as transparency.

Mapping output can be configured to either reduce the number of tiles, or the number of mappings. The algorithm favours fewer horizontal sprites over vertical ones.

Both methods of importing use CIEDE2000 nearest colour matching to the current palette.

## Download

The latest version can be found at: https://github.com/kirjavascript/Flex2/releases
