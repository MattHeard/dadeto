# DEND2 record selection

The report paired the private DEND2 candidate/null selector with another guarded
tail. Primary TRAN1 and legacy DEND2 now use the existing generic toRecordOrNull
selector; the duplicate private selector is removed. Valid data retains exact
object/array identities and avoids reading legacy storage when primary data wins.

The initial focused coverage run exposed preexisting missing prototype-policy
cases and an omitted parseJsonOrFallback fallback argument. Added explicit cases
rather than relaxing coverage. `.tmp/dend2-selection-tests.log`: 41 tests/three
suites, exact 100% owner coverage. `.tmp/dend2-selection-static.log`: duplication
only, 60 to 59 strict clones. `.tmp/dend2-selection-build.log`: passed. No
threshold/exemption/ignore changes; aaou remains open pending zero and full green.
