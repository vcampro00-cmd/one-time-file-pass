#include "LicensePolicy.h"
#include <assert.h>
int main(void) {
  assert(VCMayUse(true, true, 200, 100));
  assert(!VCMayUse(false, true, 200, 100));
  assert(!VCMayUse(true, false, 200, 100));
  assert(!VCMayUse(true, true, 100, 100));
  assert(!VCMayUse(true, true, 99, 100));
  return 0;
}