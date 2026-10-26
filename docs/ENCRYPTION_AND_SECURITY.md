# Encryption & Security Architecture: OTwo

## 1. Client-Side Key Derivation & Encryption Protocol
Any doctor recommendation notes or personal health notes synced to the optional cloud backend are encrypted client-side before transmission. No unencrypted free-text medical notes are sent over the network.

### Key Derivation Approach (No Hardcoded Keys)
1. **Entropy Sources**:
   - `Device Salt`: A cryptographically secure random UUID or token generated on first run and persisted in secure local storage (`AsyncStorage` / Secure Keystore).
   - `User Identity Secret`: Derived from the authenticated user's unique Supabase ID (`auth.uid()`) and user session entropy.
2. **KDF (Key Derivation Function)**:
   - Derives a 256-bit symmetric encryption key using PBKDF2 with SHA-256 (10,000+ iterations) using the Device Salt and User Identity Secret:
     $$\text{EncryptionKey} = \text{PBKDF2}(\text{SessionSecret}, \text{DeviceSalt}, \text{iterations}=10000, \text{keyLength}=256)$$
   - Neither the encryption key nor the plaintext is ever transmitted to the Supabase database.
3. **Cipher & Storage Format**:
   - Data is encrypted with AES-256 (or serialized ciphertext package with initialization vector IV and authentication tag).
   - The stored format in `onboarding_responses.doctor_recommendations_encrypted` is `iv:salt:ciphertext`.

---

## 2. Supabase Backend Security & Row Level Security (RLS)
- **Zero Public Access**: Default public read and write access is revoked on all tables.
- **Strict Row Level Security**: Every table enforces `auth.uid() = user_id`.
- **Parametric Execution**: All queries from the client use Supabase's parameterized API, mitigating SQL injection risks.
- **Rate Limiting & Auth**: Handled at Supabase Gateway level.
- **Data Export & Deletion**: Users have full sovereign control to export all local & remote data or trigger complete account and row deletion (GDPR/CCPA compliant).

---

## 3. Offline-First Security & Low-End Android Protections
- **Local SQLite Isolation**: The SQLite database (`otwo.db`) is sandboxed in the private app data directory on Android/iOS (`/data/data/com.otwo.app/databases`).
- **No Third-Party Analytics**: No telemetry SDKs, ad trackers, or third-party cookies exist in the codebase.
- **Debug Mode Disabling**: Debug tools and verbose console outputs are stripped in production builds.
