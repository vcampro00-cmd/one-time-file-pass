#ifndef VCAMPRO_LICENSE_POLICY_H
#define VCAMPRO_LICENSE_POLICY_H
#include <stdbool.h>
/* Never authorize offline or at/after the server-reported expiry. */
static inline bool VCMayUse(bool verifiedOnline, bool serverValid, double expiresAt, double now) {
  return verifiedOnline && serverValid && expiresAt > now;
}
#endif