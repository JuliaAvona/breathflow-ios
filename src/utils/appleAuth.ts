import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export async function performAppleSignIn(): Promise<{
  idToken: string;
  nonce: string;
  authorizationCode: string;
}> {
  const rawNonce = Array.from(await Crypto.getRandomBytesAsync(32))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple');
  }

  if (!credential.authorizationCode) {
    throw new Error('No authorization code returned from Apple');
  }

  return {
    idToken: credential.identityToken,
    nonce: rawNonce,
    authorizationCode: credential.authorizationCode,
    givenName: credential.fullName?.givenName ?? null,
  };
}
