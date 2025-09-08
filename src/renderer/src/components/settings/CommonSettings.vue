<template>
  <ScrollArea class="w-full h-full p-4">
    <div class="w-full h-full flex flex-col gap-6">
      <!-- 模型设置组 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
          <Icon icon="lucide:brain-circuit" class="w-4 h-4" />
          <span>{{ t('settings.common.modelSettings') || '模型设置' }}</span>
        </div>
        
        <!-- 助手模型选择 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:bot" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.searchAssistantModel') }}</span>
              </span>
              <div class="flex-shrink-0 min-w-64 max-w-96">
                <Popover v-model:open="modelSelectOpen">
                  <PopoverTrigger as-child>
                    <Button variant="outline" class="w-full justify-between">
                      <div class="flex items-center gap-2">
                        <ModelIcon
                          :model-id="selectedSearchModel?.id || ''"
                          class="h-4 w-4"
                          :is-dark="themeStore.isDark"
                        />
                        <span class="truncate">{{
                          selectedSearchModel?.name || t('settings.common.selectModel')
                        }}</span>
                      </div>
                      <ChevronDown class="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-80 p-0">
                    <ModelSelect
                      :type="[ModelType.Chat, ModelType.ImageGeneration]"
                      @update:model="handleSearchModelSelect"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.searchAssistantModelDesc') }}
            </div>
          </div>
        </div>
        
        <!-- 视觉模型选择 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:eye" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.visionModel') }}</span>
              </span>
              <div class="flex-shrink-0 min-w-64 max-w-96">
                <Popover v-model:open="visionModelSelectOpen">
                  <PopoverTrigger as-child>
                    <Button variant="outline" class="w-full justify-between">
                      <div class="flex items-center gap-2">
                        <ModelIcon
                          :model-id="selectedVisionModel?.id || ''"
                          class="h-4 w-4"
                          :is-dark="themeStore.isDark"
                        />
                        <span class="truncate">{{
                          selectedVisionModel?.name || t('settings.common.selectModel')
                        }}</span>
                      </div>
                      <ChevronDown class="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-80 p-0">
                    <ModelSelect
                      :type="[]"
                      :vision-only="true"
                      @update:model="handleVisionModelSelect"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.visionModelDesc') }}
            </div>
            <!-- 添加提示信息，当未选择视觉模型时显示 -->
            <div v-if="!selectedVisionModel" class="text-xs text-yellow-600 dark:text-yellow-400 pl-0">
              {{ t('settings.common.visionModelNotSelectedWarning') }}
            </div>
          </div>
          
        </div>
      </div>
      
      <!-- 网页内容长度限制 -->
      <div class="flex flex-row p-2 items-center gap-2 px-2">
        <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
          <Icon icon="lucide:globe" class="w-4 h-4 text-muted-foreground" />
          <span class="text-sm font-medium">{{ t('settings.common.webContentLengthLimit') }}</span>
          <div class="text-xs text-muted-foreground ml-1">
            {{ t('settings.common.webContentLengthLimitHint') }}
          </div>
        </span>
        <div class="flex-shrink-0 flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded-full"
            @click="decreaseWebContentLimit"
            :disabled="webContentLengthLimit <= 0"
          >
            <Icon icon="lucide:minus" class="h-3 w-3" />
          </Button>
          <div class="relative">
            <div
              v-if="!isEditingLimit"
              @click="startEditingLimit"
              class="min-w-16 h-8 flex items-center justify-center text-sm font-semibold cursor-pointer hover:bg-accent rounded px-2"
            >
              {{ webContentLengthLimit }}
            </div>
            <Input
              v-else
              ref="limitInputRef"
              type="number"
              :min="0"
              :max="10000"
              :model-value="webContentLengthLimit"
              @update:model-value="handleWebContentLengthLimitChange"
              @blur="stopEditingLimit"
              @keydown.enter="stopEditingLimit"
              @keydown.escape="stopEditingLimit"
              class="min-w-16 h-8 text-center text-sm font-semibold"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 rounded-full"
            @click="increaseWebContentLimit"
            :disabled="webContentLengthLimit >= 10000"
          >
            <Icon icon="lucide:plus" class="h-3 w-3" />
          </Button>
          <span class="text-xs text-muted-foreground ml-1">字符</span>
        </div>
      </div>

      <!-- 搜索设置组 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
          <Icon icon="lucide:search" class="w-4 h-4" />
          <span>{{ t('settings.common.searchSettings') || '搜索设置' }}</span>
        </div>
        
        <!-- 搜索引擎选择 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <span class="text-sm font-medium">{{ t('settings.common.searchEngine') }}</span>
              </span>
              <div class="flex-shrink-0 flex gap-2">
                <div class="min-w-52 max-w-96">
                  <Select v-model="selectedSearchEngine" class="">
                    <SelectTrigger>
                      <SelectValue :placeholder="t('settings.common.searchEngineSelect')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="engine in settingsStore.searchEngines"
                        :key="engine.id"
                        :value="engine.id"
                      >
                        {{ engine.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  :title="t('settings.common.addCustomSearchEngine')"
                  @click="openAddSearchEngineDialog"
                >
                  <Icon icon="lucide:plus" class="w-4 h-4" />
                </Button>
                <Button
                  v-if="isCurrentEngineCustom"
                  variant="outline"
                  size="icon"
                  :title="t('settings.common.deleteCustomSearchEngine')"
                  @click="currentEngine && openDeleteSearchEngineDialog(currentEngine)"
                >
                  <Icon icon="lucide:trash-2" class="w-4 h-4 text-destructive" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  :title="t('settings.common.testSearchEngine')"
                  @click="openTestSearchEngineDialog"
                >
                  <Icon icon="lucide:flask-conical" class="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.searchEngineDesc') }}
            </div>
          </div>
        </div>
        
        <!-- 搜索预览开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:eye" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.searchPreview') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="search-preview-switch"
                  :checked="searchPreviewEnabled"
                  @update:checked="handleSearchPreviewChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.searchPreviewDesc') }}
            </div>
          </div>
        </div>
      </div>

      <!-- 网络设置组 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
          <Icon icon="lucide:globe" class="w-4 h-4" />
          <span>{{ t('settings.common.networkSettings') || '网络设置' }}</span>
        </div>
        
        <!-- 代理模式选择 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <span class="text-sm font-medium">{{ t('settings.common.proxyMode') }}</span>
              </span>
              <div class="flex-shrink-0 min-w-64 max-w-96">
                <Select v-model="selectedProxyMode" class="">
                  <SelectTrigger>
                    <SelectValue :placeholder="t('settings.common.proxyModeSelect')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="mode in proxyModes" :key="mode.value" :value="mode.value">
                      {{ mode.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.proxyModeDesc') }}
            </div>
          </div>
        </div>
        <!-- 自定义代理配置 -->
        <div v-if="selectedProxyMode === 'custom'" class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:link" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.customProxyUrl') }}</span>
              </span>
              <div class="flex-shrink-0 min-w-64 max-w-96">
                <Input
                  v-model="customProxyUrl"
                  :placeholder="t('settings.common.customProxyUrlPlaceholder')"
                  :class="{ 'border-red-500': showUrlError }"
                  @input="validateProxyUrl"
                  @blur="validateProxyUrl"
                />
              </div>
            </div>
            <div v-if="showUrlError" class="text-xs text-red-500 ml-6">
              {{ t('settings.common.invalidProxyUrl') }}
            </div>
          </div>
        </div>
      </div>
      <!-- 界面与交互设置 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
          <Icon icon="lucide:settings" class="w-4 h-4" />
          <span>{{ t('settings.common.interfaceSettings') || '界面与交互' }}</span>
        </div>

        <!-- 日志开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:file-text" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.loggingEnabled') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="logging-switch"
                  :checked="loggingEnabled"
                  @update:checked="handleLoggingChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.loggingEnabledDesc') }}
            </div>
          </div>
        </div>

        <!-- 开发者工具开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:code" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.devToolsAutoOpen') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="dev-tools-switch"
                  :checked="devToolsAutoOpenEnabled"
                  @update:checked="handleDevToolsAutoOpenChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.devToolsAutoOpenDesc') }}
            </div>
          </div>
        </div>

        <!-- 音效开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:volume-2" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.soundEnabled') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch id="sound-switch" :checked="soundEnabled" @update:checked="handleSoundChange" />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.soundEnabledDesc') }}
            </div>
          </div>
        </div>

        <!-- 复制全部（含COT）开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:copy" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.copyWithCotEnabled') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="copy-with-cot-switch"
                  :checked="copyWithCotEnabled"
                  @update:checked="handleCopyWithCotChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.copyWithCotEnabledDesc') }}
            </div>
          </div>
        </div>
      </div>

      <!-- 个性化设置 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
          <Icon icon="lucide:palette" class="w-4 h-4" />
          <span>{{ t('settings.common.personalizationSettings') || '个性化设置' }}</span>
        </div>

        <!-- 语言选择 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:languages" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.language') }}</span>
              </span>
              <div class="flex-shrink-0 min-w-64 max-w-96">
                <Select v-model="selectedLanguage" class="">
                  <SelectTrigger>
                    <SelectValue :placeholder="t('settings.common.languageSelect')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="lang in languageOptions"
                      :key="lang.value"
                      :value="lang.value"
                      :dir="langStore.dir"
                    >
                      {{ lang.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.languageDesc') }}
            </div>
          </div>
        </div>

        <!-- 悬浮按钮开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:mouse-pointer-click" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.display.floatingButton') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="floating-button-switch"
                  :checked="floatingButtonStore.enabled"
                  @update:checked="handleFloatingButtonChange"
                />
              </div>
            </div>
            <div class="pl-6 text-xs text-muted-foreground">
              {{ t('settings.display.floatingButtonDesc') }}
            </div>
          </div>
        </div>

        <!-- 关闭应用行为设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:x-circle" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.closeToQuit') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="close-to-quit-switch"
                  :checked="closeToQuitEnabled"
                  @update:checked="handleCloseToQuitChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.closeToQuitDesc') }}
            </div>
          </div>
        </div>
      </div>

        <!-- 系统通知设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:bell" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{
                  t('settings.common.notifications') || '系统通知'
                }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="notifications-switch"
                  :checked="notificationsEnabled"
                  @update:checked="handleNotificationsChange"
                />
              </div>
            </div>
            <div class="pl-6 text-xs text-muted-foreground">
              {{ t('settings.common.notificationsDesc') }}
            </div>
          </div>
        </div>

        <!-- 字体大小设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
              <Icon icon="lucide:a-large-small" class="w-4 h-4 text-muted-foreground" />
              <span class="text-sm font-medium">{{ t('settings.display.fontSize') }}</span>
            </span>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.display.fontSizeDesc') }}
            </div>
            <div class="flex flex-row items-center gap-2 pl-0">
              <Slider
                :default-value="[fontSizeLevel]"
                :model-value="[fontSizeLevel]"
                :min="0"
                :max="4"
                :step="1"
                class="w-full max-w-sm"
                @update:model-value="(val) => (fontSizeLevel = val?.[0] ?? 1)"
              />
              <span class="text-xs w-16 text-center">{{
                t('settings.display.' + fontSizeClass.toLowerCase())
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 安全与隐私设置 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2 pt-6">
          <Icon icon="lucide:shield" class="w-4 h-4" />
          <span>{{ t('settings.common.securitySettings') || '安全与隐私' }}</span>
        </div>

        <!-- 投屏保护开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:shield-check" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{
                  t('settings.common.contentProtection') || '投屏保护'
                }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch
                  id="content-protection-switch"
                  :checked="contentProtectionEnabled"
                  @update:checked="handleContentProtectionChange"
                />
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.contentProtectionDesc') }}
            </div>
          </div>
        </div>

      <!-- 操作设置 -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2 pt-2">
          <Icon icon="lucide:sliders-horizontal" class="w-4 h-4" />
          <span>{{ t('settings.common.operationSettings') || '操作设置' }}</span>
        </div>

        <!-- 打开日志文件夹 -->
        <div
          class="bg-muted/30 rounded-lg p-4 border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
          @click="openLogFolder"
          :dir="langStore.dir"
        >
          <div class="flex items-center gap-2">
            <Icon icon="lucide:external-link" class="w-4 h-4 text-muted-foreground" />
            <span class="text-sm font-medium">{{ t('settings.common.openLogFolder') }}</span>
          </div>
        </div>

        <!-- 数据同步功能开关 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:refresh-cw" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.data.syncEnable') }}</span>
              </span>
              <div class="flex-shrink-0">
                <Switch v-model:checked="syncEnabled" />
              </div>
            </div>
          </div>
        </div>

        <!-- 同步文件夹设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:folder" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.data.syncFolder') }}</span>
              </span>
              <div class="flex-shrink-0 w-96 flex gap-2">
                <Input
                  v-model="syncFolderPath"
                  :disabled="!syncStore.syncEnabled"
                  class="cursor-pointer"
                  @click="syncStore.selectSyncFolder"
                />
                <Button
                  size="icon"
                  variant="outline"
                  :disabled="!syncStore.syncEnabled"
                  title="打开同步文件夹"
                  @click="syncStore.openSyncFolder"
                >
                  <Icon icon="lucide:external-link" class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- 下载目录设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:download" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.downloadDirectory') }}</span>
              </span>
              <div class="flex-shrink-0 w-96 flex gap-2">
                <Input
                  v-model="downloadDirectory"
                  class="cursor-pointer"
                  :placeholder="t('settings.common.downloadDirectoryPlaceholder')"
                  @click="selectDownloadDirectory"
                  readonly
                />
                <Button
                  size="icon"
                  variant="outline"
                  :title="t('settings.common.selectDirectory')"
                  @click="selectDownloadDirectory"
                >
                  <Icon icon="lucide:folder-open" class="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  :title="t('settings.common.openDirectory')"
                  @click="openDownloadDirectory"
                >
                  <Icon icon="lucide:external-link" class="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.downloadDirectoryDesc') }}
            </div>
          </div>
        </div>

        <!-- 安装目录设置 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <span class="flex flex-row items-center gap-2 flex-grow w-full" :dir="langStore.dir">
                <Icon icon="lucide:hard-drive" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.common.installationDirectory') }}</span>
              </span>
              <div class="flex-shrink-0 w-96 flex gap-2">
                <Input
                  v-model="installationDirectory"
                  class="cursor-pointer"
                  :placeholder="t('settings.common.installationDirectoryPlaceholder')"
                  @click="selectInstallationDirectory"
                  readonly
                  :class="{
                    'border-destructive': installationDirectory && !isInstallationPathValid
                  }"
                />
                <Button
                  size="icon"
                  variant="outline"
                  :title="t('settings.common.selectDirectory')"
                  @click="selectInstallationDirectory"
                >
                  <Icon icon="lucide:folder-open" class="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  :title="t('settings.common.openDirectory')"
                  @click="openInstallationDirectory"
                >
                  <Icon icon="lucide:external-link" class="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div class="text-xs text-muted-foreground pl-0">
              {{ t('settings.common.installationDirectoryDesc') }}
            </div>
            <div v-if="installationDirectory && !isInstallationPathValid" class="text-xs text-destructive pl-0">
              <Icon icon="lucide:alert-triangle" class="w-3 h-3 inline mr-1" />
              {{ t('settings.common.installationDirectoryChineseWarning') }}
            </div>
          </div>
        </div>

        <!-- 上次同步时间 -->
        <div class="bg-muted/30 rounded-lg p-4 border border-border/50">
          <div class="flex items-center gap-2" :dir="langStore.dir">
            <Icon icon="lucide:clock" class="w-4 h-4 text-muted-foreground" />
            <span class="text-sm font-medium">{{ t('settings.data.lastSyncTime') }}:</span>
            <span class="text-sm text-muted-foreground">
              {{
                !syncStore.lastSyncTime
                  ? t('settings.data.never')
                  : new Date(syncStore.lastSyncTime).toLocaleString()
              }}
            </span>
          </div>
        </div>

        <!-- 手动备份 -->
        <div
          class="bg-muted/30 rounded-lg p-4 border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
          :class="{
            'opacity-50 cursor-not-allowed': !syncStore.syncEnabled || syncStore.isBackingUp
          }"
          :dir="langStore.dir"
          @click="syncStore.startBackup"
        >
          <div class="flex items-center gap-2">
            <Icon icon="lucide:save" class="w-4 h-4 text-muted-foreground" />
            <span class="text-sm font-medium">{{ t('settings.data.startBackup') }}</span>
            <span v-if="syncStore.isBackingUp" class="text-xs text-muted-foreground ml-2">
              ({{ t('settings.data.backingUp') }})
            </span>
          </div>
        </div>

        <!-- 导入数据 -->
        <Dialog v-model:open="isImportDialogOpen">
          <DialogTrigger as-child>
            <div
              class="bg-muted/30 rounded-lg p-4 border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': !syncStore.syncEnabled }"
              :dir="langStore.dir"
            >
              <div class="flex items-center gap-2">
                <Icon icon="lucide:download" class="w-4 h-4 text-muted-foreground" />
                <span class="text-sm font-medium">{{ t('settings.data.importData') }}</span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{{ t('settings.data.importConfirmTitle') }}</DialogTitle>
              <DialogDescription>
                {{ t('settings.data.importConfirmDescription') }}
              </DialogDescription>
            </DialogHeader>
            <div class="p-4">
              <RadioGroup v-model="importMode" class="flex flex-col gap-2">
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="increment" />
                  <Label>{{ t('settings.data.incrementImport') }}</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="overwrite" />
                  <Label>{{ t('settings.data.overwriteImport') }}</Label>
                </div>
              </RadioGroup>
            </div>
            <DialogFooter>
              <Button variant="outline" @click="closeImportDialog">
                {{ t('dialog.cancel') }}
              </Button>
              <Button variant="default" :disabled="syncStore.isImporting" @click="handleImport">
                {{
                  syncStore.isImporting
                    ? t('settings.data.importing')
                    : t('settings.data.confirmImport')
                }}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <!-- 日志开关确认对话框 -->
      <Dialog :open="isLoggingDialogOpen" @update:open="cancelLoggingChange">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('settings.common.loggingDialogTitle') }}</DialogTitle>
            <DialogDescription>
              <div class="space-y-2">
                <p>
                  {{
                    newLoggingValue
                      ? t('settings.common.loggingEnableDesc')
                      : t('settings.common.loggingDisableDesc')
                  }}
                </p>
                <p>{{ t('settings.common.loggingRestartNotice') }}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="cancelLoggingChange">{{ t('common.cancel') }}</Button>
            <Button @click="confirmLoggingChange">{{ t('common.confirm') }}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 开发者工具开关确认对话框 -->
      <Dialog :open="isDevToolsDialogOpen" @update:open="cancelDevToolsChange">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('settings.common.devToolsDialogTitle') }}</DialogTitle>
            <DialogDescription>
              <div class="space-y-2">
                <p>
                  {{
                    newDevToolsValue
                      ? t('settings.common.devToolsEnableDesc')
                      : t('settings.common.devToolsDisableDesc')
                  }}
                </p>
                <p>{{ t('settings.common.devToolsRestartNotice') }}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="cancelDevToolsChange">{{ t('common.cancel') }}</Button>
            <Button @click="confirmDevToolsChange">{{ t('common.confirm') }}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        <!-- 数据重置选项 -->
        <AlertDialog v-model:open="isResetDialogOpen">
          <AlertDialogTrigger as-child>
            <div
              class="bg-muted/30 rounded-lg p-4 border border-border/50 hover:bg-destructive/10 cursor-pointer transition-colors"
              :dir="langStore.dir"
            >
              <div class="flex items-center gap-2">
                <Icon icon="lucide:rotate-ccw" class="w-4 h-4 text-destructive" />
                <span class="text-sm font-medium text-destructive">{{ t('settings.data.resetData') }}</span>
              </div>
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{{ t('settings.data.resetConfirmTitle') }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ t('settings.data.resetConfirmDescription') }}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div class="p-4">
              <RadioGroup v-model="resetType" class="flex flex-col gap-3">
                <div
                  class="flex items-start space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 -m-2"
                  @click="resetType = 'chat'"
                >
                  <RadioGroupItem value="chat" id="reset-chat" class="mt-1" />
                  <div class="flex flex-col">
                    <Label for="reset-chat" class="font-medium cursor-pointer">{{
                      t('settings.data.resetChatData')
                    }}</Label>
                    <p class="text-xs text-muted-foreground">
                      {{ t('settings.data.resetChatDataDesc') }}
                    </p>
                  </div>
                </div>
                <div
                  class="flex items-start space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 -m-2"
                  @click="resetType = 'knowledge'"
                >
                  <RadioGroupItem value="knowledge" id="reset-knowledge" class="mt-1" />
                  <div class="flex flex-col">
                    <Label for="reset-knowledge" class="font-medium cursor-pointer">{{
                      t('settings.data.resetKnowledgeData')
                    }}</Label>
                    <p class="text-xs text-muted-foreground">
                      {{ t('settings.data.resetKnowledgeDataDesc') }}
                    </p>
                  </div>
                </div>
                <div
                  class="flex items-start space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 -m-2"
                  @click="resetType = 'config'"
                >
                  <RadioGroupItem value="config" id="reset-config" class="mt-1" />
                  <div class="flex flex-col">
                    <Label for="reset-config" class="font-medium cursor-pointer">{{
                      t('settings.data.resetConfig')
                    }}</Label>
                    <p class="text-xs text-muted-foreground">
                      {{ t('settings.data.resetConfigDesc') }}
                    </p>
                  </div>
                </div>
                <div
                  class="flex items-start space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 -m-2"
                  @click="resetType = 'all'"
                >
                  <RadioGroupItem value="all" id="reset-all" class="mt-1" />
                  <div class="flex flex-col">
                    <Label for="reset-all" class="font-medium cursor-pointer">{{
                      t('settings.data.resetAll')
                    }}</Label>
                    <p class="text-xs text-muted-foreground">{{ t('settings.data.resetAllDesc') }}</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel @click="closeResetDialog">
                {{ t('dialog.cancel') }}
              </AlertDialogCancel>
              <AlertDialogAction
                :class="
                  cn('bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90')
                "
                :disabled="isResetting"
                @click="handleReset"
              >
                {{ isResetting ? t('settings.data.resetting') : t('settings.data.confirmReset') }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <!-- 导入结果提示对话框 -->
        <AlertDialog :open="!!syncStore.importResult">
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{{
                syncStore.importResult?.success
                  ? t('settings.data.importSuccessTitle')
                  : t('settings.data.importErrorTitle')
              }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ syncStore.importResult?.message ? t(syncStore.importResult.message) : '' }}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction @click="handleAlertAction">
                {{ t('dialog.ok') }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  </ScrollArea>

  <!-- 添加自定义搜索引擎对话框 -->
  <Dialog v-model:open="isAddSearchEngineDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('settings.common.addCustomSearchEngine') }}</DialogTitle>
        <DialogDescription>
          {{ t('settings.common.addCustomSearchEngineDesc') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="search-engine-name" class="text-right">
            {{ t('settings.common.searchEngineName') }}
          </Label>
          <Input
            id="search-engine-name"
            v-model="newSearchEngine.name"
            class="col-span-3"
            :placeholder="t('settings.common.searchEngineNamePlaceholder')"
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="search-engine-url" class="text-right">
            {{ t('settings.common.searchEngineUrl') }}
          </Label>
          <div class="col-span-3">
            <Input
              id="search-engine-url"
              v-model="newSearchEngine.searchUrl"
              :placeholder="t('settings.common.searchEngineUrlPlaceholder')"
              :class="{ 'border-red-500': showSearchUrlError }"
            />
            <div v-if="showSearchUrlError" class="text-xs text-red-500 mt-1">
              {{ t('settings.common.searchEngineUrlError') }}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeAddSearchEngineDialog">
          {{ t('dialog.cancel') }}
        </Button>
        <Button type="submit" :disabled="!isValidNewSearchEngine" @click="addCustomSearchEngine">
          {{ t('dialog.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 添加删除搜索引擎确认对话框 -->
  <Dialog v-model:open="isDeleteSearchEngineDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('settings.common.deleteCustomSearchEngine') }}</DialogTitle>
        <DialogDescription>
          {{ t('settings.common.deleteCustomSearchEngineDesc', { name: engineToDelete?.name }) }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="closeDeleteSearchEngineDialog">
          {{ t('dialog.cancel') }}
        </Button>
        <Button variant="destructive" @click="deleteCustomSearchEngine">
          {{ t('dialog.delete.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 测试搜索引擎确认对话框 -->
  <Dialog v-model:open="isTestSearchEngineDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('settings.common.testSearchEngine') }}</DialogTitle>
        <DialogDescription>
          {{ t('settings.common.testSearchEngineDesc', { engine: currentEngine?.name || '' }) }}
          <div class="mt-2">
            {{ t('settings.common.testSearchEngineNote') }}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="closeTestSearchEngineDialog">
          {{ t('dialog.cancel') }}
        </Button>
        <Button @click="testSearchEngine">
          {{ t('dialog.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 投屏保护切换确认对话框 -->
  <Dialog v-model:open="isContentProtectionDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{
          t('settings.common.contentProtectionDialogTitle') || '确认切换投屏保护'
        }}</DialogTitle>
        <DialogDescription>
          <template v-if="newContentProtectionValue">
            {{ t('settings.common.contentProtectionEnableDesc') }}
          </template>
          <template v-else>
            {{ t('settings.common.contentProtectionDisableDesc') }}
          </template>
          <div class="mt-2 font-medium">
            {{ t('settings.common.contentProtectionRestartNotice') }}
          </div>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="cancelContentProtectionChange">
          {{ t('common.cancel') }}
        </Button>
        <Button
          :variant="newContentProtectionValue ? 'default' : 'destructive'"
          @click="confirmContentProtectionChange"
        >
          {{ t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useToast } from '@/components/ui/toast/use-toast'
import { Icon } from '@iconify/vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePresenter } from '@/composables/usePresenter'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ref, onMounted, watch, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useFloatingButtonStore } from '@/stores/floatingButton'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-vue-next'
import ModelSelect from '@/components/ModelSelect.vue'
import ModelIcon from '@/components/icons/ModelIcon.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RENDERER_MODEL_META } from '@shared/presenter'
import type { SearchEngineTemplate } from '@shared/chat'
import { Switch } from '@/components/ui/switch'
import { nanoid } from 'nanoid'
import { useThemeStore } from '@/stores/theme'
import { useSoundStore } from '@/stores/sound'
import { useLanguageStore } from '@/stores/language'
import { useSyncStore } from '@/stores/sync'
import { ModelType } from '@shared/model'
import { cn } from '@/lib/utils'

const devicePresenter = usePresenter('devicePresenter')
const configPresenter = usePresenter('configPresenter')
const settingsStore = useSettingsStore()
const soundStore = useSoundStore()
const langStore = useLanguageStore()
const floatingButtonStore = useFloatingButtonStore()
const syncStore = useSyncStore()
const { t } = useI18n()
const { toast } = useToast()
const themeStore = useThemeStore()
const selectedSearchEngine = ref(settingsStore.activeSearchEngine?.id ?? 'google')
const selectedSearchModel = computed(() => settingsStore.searchAssistantModel)

const selectedProxyMode = ref('system')
const customProxyUrl = ref('')
const showUrlError = ref(false)

// 网页内容长度限制
const webContentLengthLimit = ref(3000)
const isEditingLimit = ref(false)
const limitInputRef = ref<HTMLInputElement>()

// 下载和安装目录设置
const downloadDirectory = ref('')
const installationDirectory = ref('')

// 安装目录路径验证
const isInstallationPathValid = computed(() => {
  if (!installationDirectory.value) return true
  return configPresenter.validatePathNotContainsChinese(installationDirectory.value)
})

// 新增搜索引擎相关
const isAddSearchEngineDialogOpen = ref(false)
const newSearchEngine = ref({
  name: '',
  searchUrl: ''
})
const showSearchUrlError = ref(false)

const isValidNewSearchEngine = computed(() => {
  return (
    newSearchEngine.value.name.trim() !== '' &&
    newSearchEngine.value.searchUrl.trim() !== '' &&
    newSearchEngine.value.searchUrl.includes('{query}')
  )
})

const openAddSearchEngineDialog = () => {
  newSearchEngine.value = {
    name: '',
    searchUrl: ''
  }
  showSearchUrlError.value = false
  isAddSearchEngineDialogOpen.value = true
}

const closeAddSearchEngineDialog = () => {
  isAddSearchEngineDialogOpen.value = false
}

const addCustomSearchEngine = async () => {
  if (!isValidNewSearchEngine.value) {
    if (!newSearchEngine.value.searchUrl.includes('{query}')) {
      showSearchUrlError.value = true
    }
    return
  }

  // 创建自定义搜索引擎对象
  const customEngine: SearchEngineTemplate = {
    id: `custom-${nanoid(6)}`,
    name: newSearchEngine.value.name.trim(),
    searchUrl: newSearchEngine.value.searchUrl.trim(),
    selector: '',
    extractorScript: '',
    isCustom: true
  }

  try {
    // 获取现有的自定义搜索引擎
    let customSearchEngines: SearchEngineTemplate[] = []
    try {
      customSearchEngines = (await configPresenter.getCustomSearchEngines()) || []
    } catch (error) {
      console.error('获取自定义搜索引擎失败:', error)
      customSearchEngines = []
    }

    // 添加新的自定义搜索引擎
    customSearchEngines.push(customEngine)

    // 保存自定义搜索引擎
    await configPresenter.setCustomSearchEngines(customSearchEngines)

    // 更新全局搜索引擎列表
    const allEngines = [
      ...settingsStore.searchEngines.filter((e) => !e.isCustom),
      ...customSearchEngines
    ]
    settingsStore.searchEngines.splice(0, settingsStore.searchEngines.length, ...allEngines)

    // 选择新添加的引擎
    selectedSearchEngine.value = customEngine.id
    await settingsStore.setSearchEngine(customEngine.id)

    closeAddSearchEngineDialog()
  } catch (error) {
    console.error('添加自定义搜索引擎失败:', error)
    // TODO: 显示错误提示
  }
}

let proxyUrlDebounceTimer: number | null = null

const proxyModes = [
  { value: 'system', label: t('settings.common.proxyModeSystem') },
  { value: 'none', label: t('settings.common.proxyModeNone') },
  { value: 'custom', label: t('settings.common.proxyModeCustom') }
]

const validateProxyUrl = () => {
  if (!customProxyUrl.value.trim()) {
    showUrlError.value = false
    return
  }

  const urlPattern =
    /^(http|https):\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(:[0-9]+)?(\/[^\s]*)?$/

  const isValid = urlPattern.test(customProxyUrl.value)

  showUrlError.value = !isValid

  if (isValid || !customProxyUrl.value.trim()) {
    configPresenter.setCustomProxyUrl(customProxyUrl.value)
  }
}

onMounted(async () => {
  selectedSearchEngine.value = settingsStore.activeSearchEngine?.id ?? 'google'

  selectedProxyMode.value = await configPresenter.getProxyMode()
  customProxyUrl.value = await configPresenter.getCustomProxyUrl()
  if (selectedProxyMode.value === 'custom' && customProxyUrl.value) {
    validateProxyUrl()
  }
  
  // 初始化语言设置
  selectedLanguage.value = langStore.language
  
  // 初始化数据同步
  await syncStore.initialize()
  
  // 初始化视觉模型
  await initVisionModel()

  // 加载网页内容长度限制设置
  try {
    const savedLimit = await configPresenter.getSetting<number>('webContentLengthLimit')
    if (savedLimit !== undefined && savedLimit !== null) {
      webContentLengthLimit.value = savedLimit
    }
  } catch (error) {
    console.error('加载网页内容长度限制设置失败:', error)
  }
  
  // 初始化下载和安装目录（通过 IPC 暴露的方法为异步，需 await）
  try {
    downloadDirectory.value = await configPresenter.getDownloadDirectory()
    installationDirectory.value = await configPresenter.getInstallationDirectory()
  } catch (error) {
    console.error('初始化目录设置失败:', error)
  }
})

watch(selectedSearchEngine, async (newValue) => {
  await settingsStore.setSearchEngine(newValue)
})

watch(selectedProxyMode, (newValue) => {
  configPresenter.setProxyMode(newValue)
})

watch(customProxyUrl, () => {
  if (proxyUrlDebounceTimer !== null) {
    clearTimeout(proxyUrlDebounceTimer)
  }
  proxyUrlDebounceTimer = window.setTimeout(() => {
    validateProxyUrl()
  }, 300)
})

const modelSelectOpen = ref(false)
const visionModelSelectOpen = ref(false)

// 视觉模型相关
const selectedVisionModel = ref<RENDERER_MODEL_META | null>(null)

// 处理视觉模型选择
const handleVisionModelSelect = (model: RENDERER_MODEL_META, providerId: string) => {
  console.log('update vision model', model, providerId)
  selectedVisionModel.value = model
  configPresenter.setVisionModel(providerId, model.id)
  visionModelSelectOpen.value = false
}

// 初始化视觉模型
const initVisionModel = async () => {
  try {
    const visionModelConfig = await configPresenter.getVisionModel()
    if (visionModelConfig) {
      // 从enabled models中查找对应的模型
      const provider = settingsStore.enabledModels.find(p => p.providerId === visionModelConfig.providerId)
      if (provider) {
        const model = provider.models.find(m => m.id === visionModelConfig.modelId && m.vision)
        if (model) {
          selectedVisionModel.value = model
        }
      }
    }
  } catch (error) {
    console.error('获取视觉模型配置失败:', error)
  }
}

// 数据同步相关状态
const isImportDialogOpen = ref(false)
const importMode = ref('increment')
const isResetDialogOpen = ref(false)
const resetType = ref<'chat' | 'knowledge' | 'config' | 'all'>('chat')
const isResetting = ref(false)

// 使用计算属性处理双向绑定
const syncEnabled = computed({
  get: () => syncStore.syncEnabled,
  set: (value) => syncStore.setSyncEnabled(value)
})

const syncFolderPath = computed({
  get: () => syncStore.syncFolderPath,
  set: (value) => syncStore.setSyncFolderPath(value)
})

// 数据同步相关函数
const closeImportDialog = () => {
  isImportDialogOpen.value = false
  importMode.value = 'increment' // 重置为默认值
}

const handleImport = async () => {
  await syncStore.importData(importMode.value as 'increment' | 'overwrite')
  closeImportDialog()
}

const handleAlertAction = () => {
  // 如果导入成功，则重启应用
  console.log(syncStore.importResult)
  if (syncStore.importResult?.success) {
    syncStore.restartApp()
  }
  syncStore.clearImportResult()
}

const closeResetDialog = () => {
  isResetDialogOpen.value = false
  resetType.value = 'chat'
}

const handleReset = async () => {
  if (isResetting.value) return

  isResetting.value = true
  try {
    await devicePresenter.resetDataByType(resetType.value)
    closeResetDialog()
  } catch (error) {
    console.error('重置数据失败:', error)
  } finally {
    isResetting.value = false
  }
}

const handleSearchModelSelect = (model: RENDERER_MODEL_META, providerId: string) => {
  console.log('update search model', model, providerId)
  settingsStore.setSearchAssistantModel(model, providerId)
  modelSelectOpen.value = false
}

const isDeleteSearchEngineDialogOpen = ref(false)
const engineToDelete = ref<SearchEngineTemplate | null>(null)

const openDeleteSearchEngineDialog = (engine: SearchEngineTemplate) => {
  engineToDelete.value = engine
  isDeleteSearchEngineDialogOpen.value = true
}

const closeDeleteSearchEngineDialog = () => {
  isDeleteSearchEngineDialogOpen.value = false
}

const deleteCustomSearchEngine = async () => {
  if (!engineToDelete.value) return

  try {
    // 获取现有的自定义搜索引擎
    let customSearchEngines: SearchEngineTemplate[] = []
    try {
      customSearchEngines = (await configPresenter.getCustomSearchEngines()) || []
    } catch (error) {
      console.error('获取自定义搜索引擎失败:', error)
      customSearchEngines = []
    }

    // 记录被删除的是否为当前选中的引擎
    const isDeletingActiveEngine = selectedSearchEngine.value === engineToDelete.value?.id

    // 过滤掉要删除的搜索引擎
    customSearchEngines = customSearchEngines.filter((e) => e.id !== engineToDelete.value?.id)

    // 保存自定义搜索引擎
    await configPresenter.setCustomSearchEngines(customSearchEngines)

    // 更新全局搜索引擎列表
    const allEngines = [
      ...settingsStore.searchEngines.filter((e) => !e.isCustom),
      ...customSearchEngines
    ]
    settingsStore.searchEngines.splice(0, settingsStore.searchEngines.length, ...allEngines)

    // 如果删除的是当前选中的引擎，则切换到第一个默认引擎
    if (isDeletingActiveEngine) {
      // 找到第一个默认引擎 (非自定义引擎)
      const firstDefaultEngine = settingsStore.searchEngines.find((e) => !e.isCustom)
      if (firstDefaultEngine) {
        selectedSearchEngine.value = firstDefaultEngine.id
        await settingsStore.setSearchEngine(firstDefaultEngine.id)
      }
    }

    closeDeleteSearchEngineDialog()
  } catch (error) {
    console.error('删除自定义搜索引擎失败:', error)
    // TODO: 显示错误提示
  }
}

// 获取当前选择的搜索引擎对象
const currentEngine = computed(() => {
  return (
    settingsStore.searchEngines.find((engine) => engine.id === selectedSearchEngine.value) || null
  )
})

// 判断当前选择的是否为自定义搜索引擎
const isCurrentEngineCustom = computed(() => {
  return currentEngine.value?.isCustom || false
})

// 搜索预览开关
const searchPreviewEnabled = computed({
  get: () => {
    return settingsStore.searchPreviewEnabled
  },
  set: (value) => {
    settingsStore.setSearchPreviewEnabled(value)
  }
})

// 日志开关
const loggingEnabled = computed({
  get: () => {
    return settingsStore.loggingEnabled
  },
  set: (value) => {
    settingsStore.setLoggingEnabled(value)
  }
})

// 开发者工具自动打开开关
const devToolsAutoOpenEnabled = computed({
  get: () => {
    return settingsStore.devToolsAutoOpenEnabled
  },
  set: (value) => {
    settingsStore.setDevToolsAutoOpen(value)
  }
})

// 处理搜索预览状态变更
const handleSearchPreviewChange = (value: boolean) => {
  console.log('切换搜索预览状态:', value)
  settingsStore.setSearchPreviewEnabled(value)
}

// 日志开关相关
const isLoggingDialogOpen = ref(false)
const newLoggingValue = ref(false)

// 处理日志开关状态变更
const handleLoggingChange = (value: boolean) => {
  console.log('准备切换日志状态:', value)
  // 显示确认对话框
  newLoggingValue.value = value
  isLoggingDialogOpen.value = true
}

// 处理网页内容长度限制变更
const handleWebContentLengthLimitChange = async (value: string | number) => {
  const numValue = typeof value === 'string' ? parseInt(value, 10) : value
  if (numValue >= 0 && numValue <= 10000 && !isNaN(numValue)) {
    try {
      const displayText = numValue === 0 ? '无限制' : `${numValue}字符`
      console.log('设置网页内容长度限制:', displayText)
      // 直接调用presenter设置，不依赖store
      await configPresenter.setSetting('webContentLengthLimit', numValue)
      // 更新响应式变量
      webContentLengthLimit.value = numValue
    } catch (error) {
      console.error('设置网页内容长度限制失败:', error)
    }
  }
}

// 增加网页内容长度限制
const increaseWebContentLimit = () => {
  const newValue = Math.min(webContentLengthLimit.value + 100, 20000)
  handleWebContentLengthLimitChange(newValue)
}

// 减少网页内容长度限制
const decreaseWebContentLimit = () => {
  const newValue = Math.max(webContentLengthLimit.value - 100, 0)
  handleWebContentLengthLimitChange(newValue)
}

// 开始编辑限制值
const startEditingLimit = () => {
  isEditingLimit.value = true
}

// 结束编辑限制值
const stopEditingLimit = () => {
  isEditingLimit.value = false
}

const cancelLoggingChange = () => {
  isLoggingDialogOpen.value = false
}

const confirmLoggingChange = () => {
  settingsStore.setLoggingEnabled(newLoggingValue.value)
  isLoggingDialogOpen.value = false
}

// 开发者工具开关相关
const isDevToolsDialogOpen = ref(false)
const newDevToolsValue = ref(false)

// 处理开发者工具开关状态变更
const handleDevToolsAutoOpenChange = (value: boolean) => {
  console.log('准备切换开发者工具状态:', value)
  // 显示确认对话框
  newDevToolsValue.value = value
  isDevToolsDialogOpen.value = true
}

const cancelDevToolsChange = () => {
  isDevToolsDialogOpen.value = false
}

const confirmDevToolsChange = () => {
  settingsStore.setDevToolsAutoOpen(newDevToolsValue.value)
  isDevToolsDialogOpen.value = false
}

const openLogFolder = () => {
  configPresenter.openLoggingFolder()
}

// 音效开关相关
const soundEnabled = computed({
  get: () => {
    return soundStore.soundEnabled
  },
  set: (value) => {
    soundStore.setSoundEnabled(value)
  }
})

// 处理音效开关状态变更
const handleSoundChange = (value: boolean) => {
  soundStore.setSoundEnabled(value)
}

const copyWithCotEnabled = computed({
  get: () => {
    return settingsStore.copyWithCotEnabled
  },
  set: (value) => {
    settingsStore.setCopyWithCotEnabled(value)
  }
})

const handleCopyWithCotChange = (value: boolean) => {
  settingsStore.setCopyWithCotEnabled(value)
}

// 测试搜索引擎相关
const isTestSearchEngineDialogOpen = ref(false)

const openTestSearchEngineDialog = () => {
  isTestSearchEngineDialogOpen.value = true
}

const closeTestSearchEngineDialog = () => {
  isTestSearchEngineDialogOpen.value = false
}

const testSearchEngine = async () => {
  try {
    settingsStore.testSearchEngine('天气')
    closeTestSearchEngineDialog()
  } catch (error) {
    console.error('测试搜索引擎失败:', error)
  }
}

// --- Language Settings ---
const selectedLanguage = ref('system')
const languageOptions = [
  { value: 'system', label: t('common.languageSystem') || '跟随系统' }, // 使用i18n key 或 默认值
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'zh-TW', label: '繁體中文（台灣）' },
  { value: 'zh-HK', label: '繁體中文（香港）' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'fa-IR', label: 'فارسی (ایران)' }
]

watch(selectedLanguage, async (newValue) => {
  console.log('selectedLanguage', newValue)
  await langStore.updateLanguage(newValue)
})

// --- Font Size Settings ---
const fontSizeLevel = computed({
  get: () => settingsStore.fontSizeLevel,
  set: (value) => settingsStore.updateFontSizeLevel(value)
})
const fontSizeClass = computed(() => settingsStore.fontSizeClass)

// --- Content Protection Settings ---
const contentProtectionEnabled = computed({
  get: () => {
    return settingsStore.contentProtectionEnabled
  },
  set: () => {
    // Setter handled by handleContentProtectionChange
  }
})
const isContentProtectionDialogOpen = ref(false)
const newContentProtectionValue = ref(false)

const handleContentProtectionChange = (value: boolean) => {
  console.log('准备切换投屏保护状态:', value)
  newContentProtectionValue.value = value
  isContentProtectionDialogOpen.value = true
}

const cancelContentProtectionChange = () => {
  isContentProtectionDialogOpen.value = false
}

const confirmContentProtectionChange = () => {
  settingsStore.setContentProtectionEnabled(newContentProtectionValue.value)
  isContentProtectionDialogOpen.value = false
}

// --- Notifications Settings ---
const notificationsEnabled = computed({
  get: () => settingsStore.notificationsEnabled,
  set: (value) => settingsStore.setNotificationsEnabled(value)
})

const handleNotificationsChange = (value: boolean) => {
  settingsStore.setNotificationsEnabled(value)
}

const handleFloatingButtonChange = (value: boolean) => {
  floatingButtonStore.setFloatingButtonEnabled(value)
}

// --- Close To Quit Settings ---
const closeToQuitEnabled = computed({
  get: () => settingsStore.closeToQuitEnabled,
  set: (value) => settingsStore.setCloseToQuitEnabled(value)
})

const handleCloseToQuitChange = (value: boolean) => {
  settingsStore.setCloseToQuitEnabled(value)
}

// --- 下载和安装目录设置 ---
// 选择下载目录
const selectDownloadDirectory = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('show-open-dialog', {
      properties: ['openDirectory'],
      title: t('settings.common.selectDownloadDirectory')
    })
    
    if (!result.canceled && result.filePaths?.length > 0) {
      const selectedPath = result.filePaths[0]
      downloadDirectory.value = selectedPath
      configPresenter.setDownloadDirectory(selectedPath)
      
      // 确保目录存在
      await configPresenter.ensureDirectoryExists(selectedPath)
    }
  } catch (error) {
    console.error('选择下载目录失败:', error)
  }
}

// 打开下载目录
const openDownloadDirectory = async () => {
  try {
    if (downloadDirectory.value) {
      await window.electron.ipcRenderer.invoke('show-item-in-folder', downloadDirectory.value)
    }
  } catch (error) {
    console.error('打开下载目录失败:', error)
  }
}

// 选择安装目录
const selectInstallationDirectory = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('show-open-dialog', {
      properties: ['openDirectory'],
      title: t('settings.common.selectInstallationDirectory')
    })
    
    if (!result.canceled && result.filePaths?.length > 0) {
      const selectedPath = result.filePaths[0]
      
      // 验证路径不包含中文
      if (!configPresenter.validatePathNotContainsChinese(selectedPath)) {
        // 显示错误提示并阻止设置
        toast({
          title: t('settings.common.pathValidationError'),
          description: t('settings.common.pathContainsChineseError'),
          variant: 'destructive'
        })
        return
      }
      
      installationDirectory.value = selectedPath
      configPresenter.setInstallationDirectory(selectedPath)
      
      // 确保目录存在
      await configPresenter.ensureDirectoryExists(selectedPath)
    }
  } catch (error) {
    console.error('选择安装目录失败:', error)
    toast({
      title: t('settings.common.error'),
      description: t('settings.common.selectDirectoryError'),
      variant: 'destructive'
    })
  }
}

// 打开安装目录
const openInstallationDirectory = async () => {
  try {
    if (installationDirectory.value) {
      await window.electron.ipcRenderer.invoke('show-item-in-folder', installationDirectory.value)
    }
  } catch (error) {
    console.error('打开安装目录失败:', error)
  }
}
</script>
