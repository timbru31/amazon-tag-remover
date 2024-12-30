/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { _browser, storage } from './api.js';

const urlPattern =
  'https?://w*.?amazon.(ae|ca|cn|co.jp|co.uk|com.au|com.be|com.br|com.mx|com.sg|com.tr|com|de|eg|es|fr|ie|in|it|nl|pl|se|sg)/w*';

function createAmazonRules(allowedTags: string[]): browser.declarativeNetRequest.Rule[] & chrome.declarativeNetRequest.Rule[] {
  const allowedTagsRegex = allowedTags.length > 0 ? allowedTags.map((tag) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : null;

  return [
    {
      id: 7919055,
      priority: 1,
      action: {
        type: 'allow' as chrome.declarativeNetRequest.RuleActionType & browser.declarativeNetRequest._RuleActionType,
      },
      condition: {
        regexFilter:
          allowedTags.length > 0
            ? // eslint-disable-next-line no-useless-escape
              `^https?://[^?]*\.amazon\.[a-z]+(?:[/?#][^?]*)([?&](tag=(${allowedTagsRegex})|ascsubtag=(${allowedTagsRegex})))?(&.*|$)`
            : '^$',
        resourceTypes: ['main_frame', 'sub_frame'] as chrome.declarativeNetRequest.ResourceType &
          browser.declarativeNetRequest.ResourceType,
      },
    },
  ];
}

async function updateRules(allowedTags: string[]) {
  const addRules = createAmazonRules(allowedTags);
  try {
    await _browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [7919055],
      addRules,
    });
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

_browser.webNavigation.onBeforeNavigate.addListener(
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
  async (details) => {
    try {
      const { disableNotifications } = await storage.get('disableNotifications');
      if (!disableNotifications) {
        const { allowedTags } = (await storage.get('allowedTags')) as Record<string, string[]>;
        const { [`removedTags-${details.tabId}`]: removedTags } = (await storage.get()) as Record<string, string[]>;
        const filteredRemovedTags = removedTags?.filter((tag) => !allowedTags?.includes(tag)) || [];

        if (filteredRemovedTags.length > 0) {
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

_browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    void storage.set({
      disableNotifications: false,
      allowedTags: [],
    });
  }

  await storage.get('allowedTags', async (result) => {
    await updateRules((result.allowedTags as string[]) || []);
  });
});

_browser.storage.onChanged.addListener(async (changes) => {
  if (changes.allowedTags) {
    await updateRules((changes.allowedTags.newValue as string[]) || []);
  }
});
