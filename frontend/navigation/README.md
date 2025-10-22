# Navigation
- Create a development environment seperate from production
- Create a new section within `Sections` folder called custom-header

## Modify Theme
Add a new header design option to the theme’s settings, allowing the selection of custom-header via the Shopify Customizer. (e.g. `header_type_custom`)

## Modify Settings Schema
To allow selecting header_type_custom in the Shopify Customizer, update the theme’s settings schema to include the new header option:

- Open `settings_schema.json` in the Config folder.

- Find the section defining header_design (it’s likely a select input with options for `header_type_1`, `header_type_2`, `header_type_3`).

- Add a new option for `header_type_custom`.