// I am deliberately not pinning the resources type here. Doing so makes
// useTranslation('dashboard') reject keys from other namespaces even with
// the explicit `ns:key` form, which doesn't work for components that read
// across namespaces. The per-namespace JSON still ships normally ,  we just
// give up strict key autocomplete in exchange for a usable t() call.
import 'i18next';

export {};
