# Google Cloud Console Setup Guide

Follow these steps to set up Google Drive API integration for your CSV uploader.

## 🚀 Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name (e.g., "CSV-Drive-Uploader")
4. Click **"Create"**

## 🔧 Step 2: Enable Google Drive API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on it and press **"Enable"**

## 🔐 Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Fill in required fields:
   - **App name**: "CSV Drive Uploader"
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **"Save and Continue"**
5. **Scopes**: Click **"Add or Remove Scopes"**
   - Search and add: `https://www.googleapis.com/auth/drive.file`
   - Click **"Update"** → **"Save and Continue"**
6. **Test users**: Add your email address
7. Click **"Save and Continue"** → **"Back to Dashboard"**

## 🔑 Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Choose **"Web application"**
4. **Name**: "CSV Uploader Web Client"
5. **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   https://yourdomain.com
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:5173
   https://yourdomain.com
   ```
7. Click **"Create"**
8. **Copy the Client ID** (you'll need this)

## 🔐 Step 5: Create API Key

1. In **"Credentials"**, click **"+ Create Credentials"** → **"API Key"**
2. **Copy the API Key** (you'll need this)
3. Click **"Restrict Key"**
4. **API restrictions**: Select **"Restrict key"**
5. Choose **"Google Drive API"**
6. **Website restrictions**: Add your domains
7. Click **"Save"**

## 📁 Step 6: Get Google Drive Folder ID

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder for CSV uploads (e.g., "CSV-Uploads")
3. Open the folder
4. **Copy the Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```

## ⚙️ Step 7: Configure Your React App

Replace these values in `GoogleDriveUploader.tsx`:

```typescript
const GOOGLE_CONFIG = {
  API_KEY: 'YOUR_API_KEY_HERE',           // From Step 5
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE',       // From Step 4
  FOLDER_ID: 'YOUR_FOLDER_ID_HERE',       // From Step 6
  DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  SCOPES: 'https://www.googleapis.com/auth/drive.file'
};
```

## 🔒 Step 8: Security Considerations

### For Production:
1. **Domain Restrictions**: Add only your production domain
2. **API Key Restrictions**: Restrict to specific APIs and domains
3. **OAuth Consent**: Submit for verification if needed
4. **Environment Variables**: Store credentials securely

### For Development:
1. Keep `localhost:5173` in authorized origins
2. Use test users during development
3. Monitor API usage in Google Cloud Console

## 📋 Required Scopes

Your app uses this scope:
- `https://www.googleapis.com/auth/drive.file` - Create and access files in Google Drive

## 🚨 Troubleshooting

### Common Issues:

1. **"Origin not allowed"**:
   - Check authorized JavaScript origins in OAuth credentials
   - Ensure exact URL match (including port)

2. **"API Key invalid"**:
   - Verify API key restrictions
   - Check if Google Drive API is enabled

3. **"Access denied"**:
   - Add your email to test users
   - Check OAuth consent screen configuration

4. **"Folder not found"**:
   - Verify folder ID is correct
   - Ensure folder is accessible by authenticated user

### Testing:
1. Test with your own Google account first
2. Check browser console for detailed error messages
3. Verify all credentials are correctly copied

## 📊 Monitoring

Monitor your API usage:
1. Go to **"APIs & Services"** → **"Dashboard"**
2. View **Google Drive API** usage
3. Set up quotas and alerts if needed

## 🎯 Next Steps

After setup:
1. Test the upload functionality
2. Verify files appear in your Google Drive folder
3. Check that scope prefixes are added to filenames
4. Test authentication flow with different users

---

**Note**: Keep your API keys and client secrets secure. Never commit them to public repositories!