import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

export default function Support() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>FAIRZY</Text>
          <Text style={styles.tagline}>The fun, fair way to share life's turns</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Text style={styles.paragraph}>
            For support, questions, or feedback, please reach out through the app's feedback feature or contact the developer directly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Fairzy</Text>
          <Text style={styles.paragraph}>
            Fairzy is a turn-tracking application designed for couples, families, and friends who want to maintain fairness in shared responsibilities. Whether it's deciding who cooks dinner, who drives, or whose turn it is to pick the movie, Fairzy makes turn-taking effortless and transparent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms and Conditions</Text>

          <Text style={styles.subheading}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using Fairzy, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>

          <Text style={styles.subheading}>2. Use License</Text>
          <Text style={styles.paragraph}>
            Permission is granted to use Fairzy for personal, non-commercial purposes. This license shall automatically terminate if you violate any of these restrictions.
          </Text>

          <Text style={styles.subheading}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
          </Text>

          <Text style={styles.subheading}>4. User Content</Text>
          <Text style={styles.paragraph}>
            You retain all rights to any content you submit, post or display on or through the service. By posting content, you grant us a license to use, modify, and display such content for the purpose of providing the service.
          </Text>

          <Text style={styles.subheading}>5. Privacy</Text>
          <Text style={styles.paragraph}>
            We respect your privacy and are committed to protecting your personal information. We collect only the information necessary to provide our services, including your email address and the data you create within the app (turn lists, member names, etc.).
          </Text>

          <Text style={styles.subheading}>6. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Text>

          <Text style={styles.subheading}>7. Service Availability</Text>
          <Text style={styles.paragraph}>
            We strive to maintain service availability but do not guarantee uninterrupted access. We reserve the right to modify or discontinue the service at any time without notice.
          </Text>

          <Text style={styles.subheading}>8. Prohibited Uses</Text>
          <Text style={styles.paragraph}>
            You may not use Fairzy to:
          </Text>
          <Text style={styles.bulletPoint}>• Violate any applicable laws or regulations</Text>
          <Text style={styles.bulletPoint}>• Infringe upon the rights of others</Text>
          <Text style={styles.bulletPoint}>• Transmit harmful or malicious code</Text>
          <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems</Text>
          <Text style={styles.bulletPoint}>• Use the service for any commercial purposes without permission</Text>

          <Text style={styles.subheading}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            Fairzy is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
          </Text>

          <Text style={styles.subheading}>10. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the modified terms.
          </Text>

          <Text style={styles.subheading}>11. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties.
          </Text>

          <Text style={styles.subheading}>12. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms and Conditions, please contact us through the app.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Fairzy. All rights reserved.</Text>
          <Text style={styles.footerText}>Last updated: January 14, 2026</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    ...Platform.select({
      web: {
        paddingHorizontal: 48,
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  paragraph: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
    marginBottom: 16,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
    marginLeft: 16,
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
    marginVertical: 12,
  },
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
});
