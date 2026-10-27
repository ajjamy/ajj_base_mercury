<?php

declare(strict_types=1);

namespace Drupal\ajj_base_mercury\Hook;

use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Breadcrumb\ChainBreadcrumbBuilderInterface;
use Drupal\Core\Controller\TitleResolverInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Extension\ThemeExtensionList;
use Drupal\Core\Extension\ThemeSettingsProvider;
use Drupal\Core\Hook\Attribute\Hook;
use Drupal\Core\Messenger\MessengerTrait;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\ajj_base_mercury\RenderCallbacks;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\node\NodeInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Contains hook implementations for Mercury.
 */
final class ThemeHooks {

  use MessengerTrait;
  use StringTranslationTrait;

  /**
   * The Drupal root.
   */
  private static ?string $appRoot = NULL;

  public function __construct(
    private readonly ThemeSettingsProvider $themeSettings,
    private readonly RequestStack $requestStack,
    private readonly ThemeExtensionList $themeList,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly RouteMatchInterface $routeMatch,
    private readonly TitleResolverInterface $titleResolver,
    private readonly ChainBreadcrumbBuilderInterface $breadcrumb,
    private readonly ModuleHandlerInterface $moduleHandler,
    #[Autowire(param: 'app.root')] string $appRoot,
  ) {
    self::$appRoot ??= $appRoot;
  }

  /**
   * Implements hook_element_info_alter().
   */
  #[Hook('element_info_alter')]
  public function alterElementInfo(array &$info): void {
    $info['component']['#pre_render'][] = [RenderCallbacks::class, 'preRenderComponent'];
  }

  /**
   * Implements hook_library_info_alter().
   */
  #[Hook('library_info_alter')]
  public function alterLibraryInfo(array &$libraries, string $extension): void {
    $override = static function (string $name, string $replacement) use (&$libraries): void {
      $old_parents = ['global', 'css', 'theme', $name];
      $new_parents = [...array_slice($old_parents, 0, -1), $replacement];
      $css_settings = NestedArray::getValue($libraries, $old_parents);
      NestedArray::setValue($libraries, $new_parents, $css_settings);
      NestedArray::unsetValue($libraries, $old_parents);
    };
    if ($extension === 'ajj_base_mercury') {
      if (file_exists(self::$appRoot . '/theme.css')) {
        $override('src/theme.css', '/theme.css');
      }
      if (file_exists(self::$appRoot . '/fonts.css')) {
        $override('src/fonts.css', '/fonts.css');
      }
    }
  }

  /**
   * Implements hook_form_FORM_ID_alter().
   */
  #[Hook('form_system_theme_settings_alter')]
  public function themeSettingsFormAlter(array &$form): void {
    $form['scheme'] = [
      '#type' => 'radios',
      '#title' => t('Color scheme'),
      '#default_value' => $this->themeSettings->getSetting('scheme'),
      '#options' => [
        'light' => t('Light'),
        'dark' => t('Dark'),
      ],
    ];
    $message = $this->t("See <code>@path</code> to learn how to customize Mercury's fonts, colors, and components.", [
      '@path' => $this->themeList->getPath('ajj_base_mercury') . '/CUSTOMIZING.md',
    ]);
    $this->messenger()->addMessage($message, 'info');
  }

  /**
   * Implements template_preprocess_image_widget().
   */
  #[Hook('preprocess_image_widget')]
  public function preprocessImageWidget(array &$variables): void {
    $data = &$variables['data'];

    // This prevents image widget templates from rendering preview container
    // HTML to users that do not have permission to access these previews.
    // @todo revisit in https://drupal.org/node/953034
    // @todo revisit in https://drupal.org/node/3114318
    if (isset($data['preview']['#access']) && $data['preview']['#access'] === FALSE) {
      unset($data['preview']);
    }
  }

  /**
   * Implements template_preprocess_html().
   */
  #[Hook('preprocess_html')]
  public function preprocessHtml(array &$variables): void {
    $variables['scheme'] = $this->themeSettings->getSetting('scheme');
    // Get the theme base path for font preloading.
    $variables['ajj_base_mercury_path'] = $this->requestStack->getCurrentRequest()->getBasePath() . '/' . $this->themeList->getPath('ajj_base_mercury');
  }

  /**
   * Implements template_preprocess_page().
   */
  #[Hook('preprocess_page')]
  public function preprocessPage(array &$variables): void {
    // @see \Drupal\Core\Block\Plugin\Block\PageTitleBlock::build()
    $variables['title'] = [
      '#type' => 'page_title',
      '#title' => $variables['page']['#title'] ?? $this->titleResolver->getTitle(
        $this->requestStack->getCurrentRequest(),
        $this->routeMatch->getRouteObject(),
      ),
    ];

    // @see \Drupal\system\Plugin\Block\SystemBreadcrumbBlock::build()
    $variables['breadcrumb'] = $this->breadcrumb->build($this->routeMatch)
      ->toRenderable();

    $route_name = $this->routeMatch->getRouteName();
    if ($route_name === 'entity.canvas_page.canonical' || str_starts_with($this->routeMatch->getRouteObject()?->getPath() ?? '', '/canvas/')) {
      $variables['rendered_by_canvas'] = TRUE;
    }
    elseif ($route_name === 'entity.node.canonical' && $this->moduleHandler->moduleExists('canvas')) {
      $node = $this->routeMatch->getParameter('node');
      assert($node instanceof NodeInterface);

      $variables['rendered_by_canvas'] = (bool) $this->entityTypeManager->getStorage('content_template')
        ->getQuery()
        ->accessCheck(FALSE)
        ->count()
        ->condition('content_entity_type_id', 'node')
        ->condition('content_entity_type_bundle', $node->getType())
        ->condition('content_entity_type_view_mode', 'full')
        ->condition('status', TRUE)
        ->execute();
    }
    else {
      $variables['rendered_by_canvas'] = FALSE;
    }
  }

  /**
   * Implements template_preprocess_region().
   *
   * Provides the site logo to the footer, matching the header branding.
   */
  #[Hook('preprocess_region')]
  public function preprocessRegion(array &$variables): void {
    if ($variables['region'] !== 'footer') {
      return;
    }
    $variables['site_logo'] = theme_get_setting('logo.url', 'ajj_base_mercury');
    $variables['site_name'] = \Drupal::config('system.site')->get('name');
  }

  /**
   * Implements hook_theme_suggestions_page_alter().
   *
   * Adds page--node--BUNDLE suggestions, e.g. page--node--landing-page.
   */
  #[Hook('theme_suggestions_page_alter')]
  public function themeSuggestionsPageAlter(array &$suggestions, array $variables): void {
    if ($this->routeMatch->getRouteName() !== 'entity.node.canonical') {
      return;
    }
    $node = $this->routeMatch->getParameter('node');
    if ($node instanceof NodeInterface) {
      $suggestions[] = 'page__node__' . $node->bundle();
    }
  }

  /**
   * Implements template_preprocess_menu_link_content().
   *
   * Provides the mega menu's featured block fields individually, so
   * menu-link-content--main--menu-level-0--mega-menu.html.twig can lay them
   * out.
   */
  #[Hook('preprocess_menu_link_content')]
  public function preprocessMenuLinkContent(array &$variables): void {
    $link = $variables['menu_link_content'] ?? NULL;
    if (!$link || !$link->hasField('field_mega_featured_block')) {
      return;
    }

    $block = $link->get('field_mega_featured_block')->entity;
    if (!$block) {
      return;
    }

    // Rebuild the menu when the block is edited.
    $cacheability = CacheableMetadata::createFromObject($block);
    $access = $block->access('view', NULL, TRUE);
    $cacheability->addCacheableDependency($access);
    $cacheability->applyTo($variables);

    if (!$access->isAllowed()) {
      return;
    }

    $hidden_label = ['label' => 'hidden'];
    $link_item = $block->get('field_block_link')->first();

    $variables['featured_block'] = [
      'media' => $block->get('field_block_media')->view($hidden_label + [
        'type' => 'entity_reference_entity_view',
        'settings' => ['view_mode' => 'default'],
      ]),
      'heading' => $block->get('field_heading')->value,
      'body' => $block->get('body')->view($hidden_label),
      'link_url' => $link_item && !$link_item->isEmpty() ? $link_item->getUrl()->toString() : NULL,
      'link_title' => $link_item?->title,
    ];
  }

  /**
   * Implements hook_theme_suggestions_views_view_unformatted_alter().
   *
   * Renders a view as a carousel when "views-carousel" is in the display's
   * CSS class setting.
   */
  #[Hook('theme_suggestions_views_view_unformatted_alter')]
  public function themeSuggestionsViewsViewUnformattedAlter(array &$suggestions, array $variables): void {
    $css_class = $variables['view']->display_handler->getOption('css_class') ?? '';
    if (in_array('views-carousel', explode(' ', $css_class), TRUE)) {
      $suggestions[] = 'views_view_unformatted__carousel';
    }
  }

}
