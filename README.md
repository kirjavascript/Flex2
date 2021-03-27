<div align="center">
    <img src="https://i.imgur.com/NrHcaGC.png" alt="flex 2">
    <br>
</div>
<br>

Flex 2 is a sprite editor for the Sega Megadrive

# [download](https://github.com/kirjavascript/Flex2/releases)

[//]: # (__docs__)

## Controls

Most of the keyboard shortcuts (and indeed, behaviours for the application) are listed on the Mappings tab at the bottom. Some commands take a multiplier, so <kbd>32</kbd> + <kbd>Up</kbd> will move the selected mappings 32 pixels up, or <kbd>8</kbd> + <kbd>nt</kbd> will add eight new tiles.

### Inputs

You can cycle through options in dropdown boxes and increase/decrease numbers in textboxes with the mouse scroll wheel. This also works for things like colour select in drawing mode. Up/Down can also be used in textboxes.

### General UI

The UI layout is fully customisable by moving or resizing tabs.

## File Screen

After selecting a game format, individual assets can be saved and loaded. Art based assetts can specify an offset to load from (for example, for loading HUD graphics from a VRAM dump). To load every asset as once, use the load/save in the 'Object' line.

The 'label' specified in the mapping and DPLC definitions will be used as the main label in ASM file output.

The file screen is reused for individual objects in projects.

## Project Files

Project files serve as definitions for all the objects in your project. They should sit at the root of your project directory and be committed to version control. Project file configuration is autosaved.

Projects consist of objects, which are definitions of the filepaths used for an object's assets, and folders, which can be used to organise objects into groups.

The filetree style menu on the left of the project screen allows you to drag and drop objects and folders to different places to more easily organise them. Right clicking gives you a menu for various operations for managing objects and folders, and each item can be renamed within the filetree as well as in the object configuration itself.

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

The new mapping overlay can be toggled with <kbd>nm</kbd>. To add a new mapping piece, drag it from the new mapping overlay to where in the mapping area you want it to display and the new mapping overlay will move out of the way.

The overlay can be configured to autodismiss when placing a piece, or return to allow easily adding multiple pieces.

### Drawing Mode

When entering drawing mode by pressing <kbd>m</kbd>, dragging over the sprite will draw in the respective colour of that mouse button. If mappings overlap, both will have the colour applied.

### Raw Editor

When doing actions like deleting a mapping, Flex 2 will attempt to remove corresponding unused DPLCs. The raw editor allows you to modify the raw data for mappings and DPLCs without performing any of these optimisations. It can also be used to change the draw order by reordering mappings.

## Palettes

Palette input will be normalised to Megadrive colours. To change the order of palette lines, you can drag the numbers to different positions.

## Sprites

The Sprites tab gives an overview of your full object's data, allowing you to change sprites or reorder them by dragging and dropping. Each sprite will autozoom out to best fit the mapping for it in the frame.

## Importing

When importing an image over the current frame there is no limitation on image dimensions.

For importing a spritesheet, either the alpha channel or the top left pixel color will serve as transparency. The fuzziness dictates the minimum separation distance between sprites.

Mapping output can be configured to either reduce the number of tiles, or the number of mappings. The algorithm favours fewer horizontal sprites over vertical ones.

Both methods of importing use CIEDE2000 nearest colour matching to the current palette.

## Custom Mappings

As of version 1.0.0, Flex 2 supports a wider array of mapping formats and allows you to specify your own. 

The base mapping formats are provided in the `scripts/` directory. These can be modified to suit whatever format you decide to come up with.

The definition file format is currently undocumented, and still being expanded on. If you have a request to add support for a new disassembly, or just want more information on the format - open an issue on github with your request.
