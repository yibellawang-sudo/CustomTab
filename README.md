# Daily Planner Chrome Extension

A powerful, customizable daily planner designed specifically for students with rotating block schedules. Transform your new tab into a productivity hub with day-specific todos, drag-and-drop scheduling, and personalized shortcuts.

## Features

### Day-Specific Task Management
- **Academic & Lifestyle Categories**: Separate your schoolwork from personal tasks
- **Day Isolation**: Each day has its own todo list - tasks don't carry forward automatically
- **Quick Entry**: Add tasks with custom durations in seconds
- **Drag & Drop Scheduling**: Move tasks from your todo list to specific time slots

### Automatic Block Schedule
- **8-Day Rotation Support**: Handles complex rotating schedules common in modern schools
- **Smart Day Calculation**: Automatically determines which blocks you have today
- **Spare Period Support**: Mark blocks as spares to keep your schedule clean
- **One-Time Setup**: Set your schedule once and it calculates every day automatically

### Smart Scheduling
- **Visual Time Blocks**: See your entire day from 6 AM to 11 PM
- **Class Integration**: Your courses appear automatically at the right times
- **Task Completion**: Mark tasks complete and track your progress
- **Schedule Navigation**: View past and future days to plan ahead

### Full Customization
- **Custom Color Schemes**: Choose your primary accent color
- **Personalized Shortcuts**: Add your most-visited sites
- **Icon Options**: Use letter icons or upload custom images
- **No Code Required**: Everything customizable through the UI

### Privacy & Performance
- **100% Local Storage**: All data stays on your device
- **No Analytics**: Zero tracking or data collection
- **Lightning Fast**: Instant load times, no server requests
- **Offline Ready**: Works perfectly without internet connection

## Installation

### Method 1: Chrome Web Store (Recommended - Coming Soon)
1. Visit the Chrome Web Store
2. Click "Add to Chrome"
3. Enjoy your new planner!

### Method 2: Manual Installation (For Development/Testing)

#### Step 1: Download the Extension
```bash
# Clone the repository
git clone https://github.com/yourusername/daily-planner-extension.git

# Or download as ZIP and extract
```

#### Step 2: Prepare the Files
Your folder structure should look like this:
```
CustomTab/
├── manifest.json
├── tab.html
├── script.js
├── style.css
└── Icon,png
```

#### Step 3: Create manifest.json
Create a file named `manifest.json` with the following content:

```json
{
    "manifest_version": 3,
    "name": "Custom New Tab",
    "version": "1.0",
    "description": "Custom new tab page with site shortcuts and daily planner",
    "chrome_url_overrides": {
        "newtab": "tab.html"
    },
    "permissions": [
        "storage",
        "tabs"
    ],
    "icons": {
        "128": "art/Icon.png"
    }
}
```

#### Step 4: Install in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `daily-planner-extension` folder
5. Open a new tab to see your planner!

#### Step 5: (Optional) Create an Icon
If you want a custom icon, create a 128x128 PNG image named `icon128.png` in the extension folder. If you skip this, Chrome will use a default icon.

### Updating the Extension
When you make changes to the code:
1. Go to `chrome://extensions/`
2. Click the refresh icon ↻ on the Daily Planner card
3. Open a new tab to see your changes

## First-Time Setup

### 1. Configure Your Class Schedule
- Click "Edit Classes" in the schedule section
- Enter your course names for each block (A-H)
- Mark any spare periods with the checkbox
- Click "Save"

### 2. Set Your Cycle Start Date
- Click "Set Start Date"
- Select the date that was Day 1 of your current rotation cycle
- Click "Save"
- The extension will automatically calculate which day you're on

### 3. Customize Your Colors (Optional)
- Click the Customize button (top-right)
- Pick your favorite accent color
- Click "Save"

### 4. Add Your Shortcuts (Optional)
- Click the Customize button
- Click "Add Shortcut"
- Enter name, URL, and choose letter or upload an icon
- Click "Add"

## Technical Details

### Built With
- **Pure JavaScript**: No frameworks, fast and lightweight
- **CSS Variables**: Easy theming and customization
- **LocalStorage API**: Persistent data without a backend
- **FileReader API**: Image upload support

### Browser Compatibility
- Chrome 88+
- Edge 88+
- Brave
- Any Chromium-based browser

### Data Storage
All data is stored in `localStorage` under the key `plannerData`:
- Daily todos and schedules
- Shortcuts and preferences
- Block schedule configuration
- Custom color settings

### Storage Limits
- LocalStorage: ~5-10MB (sufficient for years of data)
- Images: Stored as base64 (recommend icons under 100KB)


## License

MIT License - feel free to modify and distribute
