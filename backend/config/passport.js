import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from './database.js';
import { oauthConfig } from './oauth.js';
import { USER_ROLE_ENUM } from '../utils/constants.js';
import logger from '../utils/logger.js';

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
if (oauthConfig.google.clientId && oauthConfig.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: oauthConfig.google.clientId,
        clientSecret: oauthConfig.google.clientSecret,
        callbackURL: oauthConfig.google.callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const firstName = profile.name.givenName || '';
          const lastName = profile.name.familyName || '';

          // Check if user exists
          let user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            // User exists, update OAuth info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                emailVerified: true, // --- FIX: Changed from isEmailVerified
                authProvider: 'GOOGLE', // --- FIX: Ensure authProvider is set on login
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email,
                googleId: profile.id,
                firstName,
                lastName,
                role: USER_ROLE_ENUM.TRAINER,
                emailVerified: true, // --- FIX: Changed from isEmailVerified
                authProvider: 'GOOGLE',
              },
            });
            logger.info(`New user created via Google OAuth: ${email}`);
          }

          return done(null, user);
        } catch (error) {
          logger.error('Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
}

// GitHub Strategy
if (oauthConfig.github.clientId && oauthConfig.github.clientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: oauthConfig.github.clientId,
        clientSecret: oauthConfig.github.clientSecret,
        callbackURL: oauthConfig.github.callbackURL,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const name = profile.displayName || profile.username;
          const [firstName, ...lastNameParts] = name.split(' ');
          const lastName = lastNameParts.join(' ') || '';

          // Check if user exists
          let user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            // User exists, update OAuth info
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                githubId: profile.id,
                emailVerified: true, // --- FIX: Changed from isEmailVerified
                authProvider: 'GITHUB', // --- FIX: Ensure authProvider is set on login
              },
            });
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email,
                githubId: profile.id,
                firstName,
                lastName,
                role: USER_ROLE_ENUM.TRAINER,
                emailVerified: true, // --- FIX: Changed from isEmailVerified
                authProvider: 'GITHUB',
              },
            });
            logger.info(`New user created via GitHub OAuth: ${email}`);
          }

          return done(null, user);
        } catch (error) {
          logger.error('GitHub OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );
}

export default passport;