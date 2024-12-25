import { _browser, storage } from './api.js';

const urlPattern =
  'https?://w*.?amazon.(ae|ca|cn|co.jp|co.uk|com.au|com.be|com.br|com.mx|com.sg|com.tr|com|de|eg|es|fr|ie|in|it|nl|pl|se|sg)/w*';

_browser.webNavigation.onBeforeNavigate.addListener(
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async (details) => {
    try {
      const { tabId, url } = details;
      const parsedUrl = new URL(url);

      const tag = parsedUrl.searchParams.get('tag');
      const ascsubtag = parsedUrl.searchParams.get('ascsubtag');

      const removedTags: string[] = [];
      if (tag) {
        removedTags.push(tag);
      }
      if (ascsubtag) {
        removedTags.push(ascsubtag);
      }

      if (removedTags.length > 0) {
        await storage.set({ [`removedTags-${tabId}`]: removedTags });
      }
    } catch (error) {
      console.error('Error storing removed tags:', error);
    }
  },
  { url: [{ urlMatches: urlPattern }] },
);

_browser.webNavigation.onCompleted.addListener(
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async (details) => {
    try {
      const { disableNotifications } = await storage.get('disableNotifications');
      if (!disableNotifications) {
        const { [`removedTags-${details.tabId}`]: removedTags } = (await storage.get()) as Record<string, string[]>;

        if (removedTags.length > 0) {
          await _browser.notifications.create('amazonTagRemoverNotification', {
            iconUrl: _browser.runtime.getURL('images/icon64.png'),
            message: `The following Amazon tracking tags have been removed: ${removedTags.join(', ')}`,
            title: 'Amazon Tag Remover',
            type: 'basic',
          });

          await storage.remove([`removedTags-${details.tabId}`]);
        }
      }
    } catch (error) {
      console.error('Error handling navigation event:', error);
    }
  },
  { url: [{ urlMatches: urlPattern }] },
);
