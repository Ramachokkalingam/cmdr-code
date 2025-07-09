import { predefinedThemes } from '../../types/settings';

export const themes = predefinedThemes.map(theme => ({
    name: theme.name,
    displayName: theme.displayName,
    colors: theme.colors,
}));
