import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, of, tap } from 'rxjs';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { SettingsApiService } from './settings-api.service';
import { SettingsLayer, SettingsLayersState, SETTINGS_CACHE_KEY } from '../models/settings-engine.model';
import { resolveSetting } from '../utils/settings-resolver';

@Injectable({
    providedIn: 'root',
})
export class SettingsEngineService {
    private readonly stateSubject = new BehaviorSubject<SettingsLayersState>(this.getInitialState());
    readonly state$ = this.stateSubject.asObservable();

    constructor(
        private settingsApiService: SettingsApiService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private translationService: TranslationService,
        private layoutService: LayoutService
    ) { }

    loadAllLayers(forceReload = false): Observable<SettingsLayersState> {
        if (!forceReload) {
            const cachedState = this.readCache();
            if (cachedState) {
                this.stateSubject.next(cachedState);
                this.applyEffectiveRuntimeToShell();
                return of(cachedState);
            }
        }

        const accountDetails = this.localStorageService.getAccountDetails();
        const entityDetails = this.localStorageService.getEntityDetails();
        const accountId = Number(accountDetails?.Account_ID || 0);
        const entityId = Number(entityDetails?.Entity_ID || 0);

        return forkJoin({
            system: this.settingsApiService.getERPSystemSettings(),
            account: accountId ? this.settingsApiService.getAccountSettings(accountId) : of({ success: false }),
            entity: entityId ? this.settingsApiService.getEntitySettings(entityId) : of({ success: false }),
        }).pipe(
            map((response) => {
                const nextState: SettingsLayersState = {
                    system: this.extractSettingsDictionary(response.system),
                    defaultAccount: this.extractNestedSettingsFromMessage(response.account, 'default_Account_Settings'),
                    defaultEntity: this.extractNestedSettingsFromMessage(response.entity, 'default_Entity_Settings'),
                    account: this.extractAccountCustomDictionary(response.account),
                    entity: this.extractEntityCustomDictionary(response.entity),
                    lastUpdatedAt: Date.now(),
                };

                this.stateSubject.next(nextState);
                this.writeCache(nextState);
                this.applyEffectiveRuntimeToShell();
                return nextState;
            })
        );
    }

    refreshRuntimeFromServer(): Observable<SettingsLayersState> {
        return this.loadAllLayers(true);
    }

    getCurrentState(): SettingsLayersState {
        return this.stateSubject.value;
    }

    getLayer(layer: SettingsLayer): Record<string, string> {
        return { ...(this.stateSubject.value[layer] || {}) };
    }

    getSetting(key: string): string | null {
        const state = this.stateSubject.value;
        return resolveSetting(
            key,
            state.account,
            state.defaultAccount,
            state.entity,
            state.defaultEntity,
            state.system
        );
    }

    extractDictionaryFromApiResponse(response: any): Record<string, string> {
        return this.extractSettingsDictionary(response);
    }

    setLayerValues(layer: SettingsLayer, values: Record<string, string>): void {
        const currentState = this.stateSubject.value;
        const nextState: SettingsLayersState = {
            ...currentState,
            [layer]: {
                ...currentState[layer],
                ...values,
            },
            lastUpdatedAt: Date.now(),
        };
        this.stateSubject.next(nextState);
        this.writeCache(nextState);
    }

    removeLayerKeys(layer: SettingsLayer, keys: string[]): void {
        const currentLayer = { ...this.stateSubject.value[layer] };
        keys.forEach((key) => delete currentLayer[key]);
        this.replaceLayer(layer, currentLayer);
    }

    replaceLayer(layer: SettingsLayer, values: Record<string, string>): void {
        const currentState = this.stateSubject.value;
        const nextState: SettingsLayersState = {
            ...currentState,
            [layer]: { ...values },
            lastUpdatedAt: Date.now(),
        };
        this.stateSubject.next(nextState);
        this.writeCache(nextState);
    }

    withOptimisticLayerUpdate<T>(
        layer: SettingsLayer,
        optimisticValues: Record<string, string>,
        operation$: Observable<T>
    ): Observable<T> {
        const previousLayer = this.getLayer(layer);
        this.setLayerValues(layer, optimisticValues);
        return operation$.pipe(
            tap({
                error: () => {
                    this.replaceLayer(layer, previousLayer);
                },
            })
        );
    }

    withOptimisticLayerRemoval<T>(layer: SettingsLayer, keys: string[], operation$: Observable<T>): Observable<T> {
        const previousLayer = this.getLayer(layer);
        this.removeLayerKeys(layer, keys);
        return operation$.pipe(
            tap({
                error: () => {
                    this.replaceLayer(layer, previousLayer);
                },
            })
        );
    }

    private extractSettingsDictionary(response: any): Record<string, string> {
        if (!response?.success || !response?.message) {
            return {};
        }

        const dictionary = response.message;
        if (dictionary == null) {
            return {};
        }
        if (Array.isArray(dictionary)) {
            return dictionary.reduce((acc: Record<string, string>, item: Record<string, any>) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    return acc;
                }
                Object.keys(item).forEach((key) => {
                    const value = item[key];
                    acc[key] = value == null ? '' : String(value);
                });
                return acc;
            }, {});
        }

        if (typeof dictionary === 'object') {
            return Object.keys(dictionary).reduce((acc: Record<string, string>, key: string) => {
                const value = dictionary[key];
                acc[key] = value == null ? '' : String(value);
                return acc;
            }, {});
        }

        return {};
    }

    private getInitialState(): SettingsLayersState {
        return {
            system: {},
            defaultAccount: {},
            account: {},
            defaultEntity: {},
            entity: {},
            lastUpdatedAt: Date.now(),
        };
    }

    private writeCache(state: SettingsLayersState): void {
        this.localStorageService.setItem(SETTINGS_CACHE_KEY, state);
    }

    private readCache(): SettingsLayersState | null {
        return this.localStorageService.getItem(SETTINGS_CACHE_KEY);
    }

    private extractNestedSettingsFromMessage(response: any, key: string): Record<string, string> {
        if (!response?.success || !response?.message || typeof response.message !== 'object' || Array.isArray(response.message)) {
            return {};
        }
        return this.mapObjectValuesToStringDict((response.message as Record<string, unknown>)[key]);
    }

    private extractAccountCustomDictionary(response: any): Record<string, string> {
        if (!response?.success || !response?.message) {
            return {};
        }
        const msg = response.message;
        if (typeof msg === 'object' && !Array.isArray(msg) && 'account_Settings' in msg) {
            return this.mapObjectValuesToStringDict(msg.account_Settings);
        }
        return this.extractSettingsDictionary(response);
    }

    private extractEntityCustomDictionary(response: any): Record<string, string> {
        if (!response?.success || !response?.message) {
            return {};
        }
        const msg = response.message;
        if (typeof msg === 'object' && !Array.isArray(msg) && 'entity_Settings' in msg) {
            return this.mapObjectValuesToStringDict(msg.entity_Settings);
        }
        return this.extractSettingsDictionary(response);
    }

    private mapObjectValuesToStringDict(raw: any): Record<string, string> {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return {};
        }
        return Object.keys(raw).reduce((acc: Record<string, string>, k: string) => {
            const value = raw[k];
            acc[k] = value == null ? '' : String(value);
            return acc;
        }, {});
    }

    private applyEffectiveRuntimeToShell(): void {
        const lang = this.normalizeResolvedLanguage(this.getSetting('language'));
        const theme = this.normalizeResolvedTheme(this.getSetting('theme'));
        this.localStorageService.setPreferredLanguageCode(lang);
        this.localStorageService.setPreferredTheme(theme);
        this.languageDirService.setUserLanguageCode(lang);
        this.languageDirService.setRtl(lang === 'ar');
        this.translationService.useLanguage(lang);
        this.layoutService.applyUserTheme(theme);
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
            document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        }
        const patch: Partial<IAccountSettings> = {};
        const fo = this.getSetting('Functions_Order') ?? this.getSetting('functions_order');
        const mo = this.getSetting('Modules_Order') ?? this.getSetting('modules_order');
        if (fo != null && fo !== '') {
            patch.Functions_Order = String(fo);
        }
        if (mo != null && mo !== '') {
            patch.Modules_Order = String(mo);
        }
        if (Object.keys(patch).length > 0) {
            this.localStorageService.mergeAccountSettings(patch);
        }
    }

    private normalizeResolvedLanguage(raw: string | null): 'en' | 'ar' {
        if (raw == null || raw === '') {
            return 'en';
        }
        const s = String(raw).trim().toLowerCase();
        if (s === 'ar' || s === 'arabic' || s === 'العربية') {
            return 'ar';
        }
        return 'en';
    }

    private normalizeResolvedTheme(raw: string | null): 'light' | 'dark' {
        const s = (raw ?? '').toString().trim().toLowerCase();
        if (s === 'dark') {
            return 'dark';
        }
        return 'light';
    }
}
