<?php

declare(strict_types=1);

namespace Drupal\ajj_base_mercury;

use Drupal\Core\Security\TrustedCallbackInterface;
use Drupal\Core\StreamWrapper\PublicStream;
use Drupal\crop\Entity\Crop;

/**
 * Implements internal callbacks to help with rendering certain SDCs.
 */
final class RenderCallbacks implements TrustedCallbackInterface {

  /**
   * Pre-render callback for SDC elements.
   *
   * @param array $element
   *   The element being rendered.
   *
   * @return array
   *   The modified element.
   */
  public static function preRenderComponent(array $element): array {
    // In the hero-blog component, convert a UNIX timestamp into a string that
    // can be passed to strtotime() by Twig's date filter.
    if ($element['#component'] === 'ajj_base_mercury:hero-blog' && isset($element['#props']['date']) && is_int($element['#props']['date'])) {
      $element['#props']['date'] = date('Y-m-d', $element['#props']['date']);
    }
    // In the section component, pass the background image's focal point to the
    // template so it can be used as the image's object-position.
    if ($element['#component'] === 'ajj_base_mercury:section' && !empty($element['#props']['background_media']['src'])) {
      $element = self::addBackgroundPosition($element);
    }
    return $element;
  }

  /**
   * Adds a background_position variable from the image's focal point crop.
   *
   * @param array $element
   *   The section component element.
   *
   * @return array
   *   The modified element.
   */
  private static function addBackgroundPosition(array $element): array {
    // Re-render when a focal point is first set or later changed.
    $element['#cache']['tags'][] = 'crop_list';

    $media = $element['#props']['background_media'];
    $uri = self::imageUrlToUri($media['src']);
    if (!$uri || !\Drupal::moduleHandler()->moduleExists('focal_point')) {
      return $element;
    }

    $crop = Crop::findCrop($uri, 'focal_point');
    if (!$crop) {
      return $element;
    }
    $element['#cache']['tags'] = array_merge($element['#cache']['tags'], $crop->getCacheTags());

    $width = $media['width'] ?? NULL;
    $height = $media['height'] ?? NULL;
    if (!$width || !$height) {
      $image = \Drupal::service('image.factory')->get($uri);
      $width = $image->getWidth();
      $height = $image->getHeight();
    }

    $position = $crop->position();
    $relative = \Drupal::service('focal_point.manager')->absoluteToRelative($position['x'], $position['y'], $width, $height);
    $background_position = sprintf('%d%% %d%%', $relative['x'], $relative['y']);

    // Core's pre-render has already built the template context from #props.
    $element['#props']['background_position'] = $background_position;
    if (isset($element['inline-template']['#context'])) {
      $element['inline-template']['#context']['background_position'] = $background_position;
    }
    return $element;
  }

  /**
   * Converts a public file URL to its stream wrapper URI.
   *
   * @param string $src
   *   An image URL, e.g. /sites/default/files/2026-10/image.jpeg?foo=bar.
   *
   * @return string|null
   *   The URI, e.g. public://2026-10/image.jpeg, or NULL if not a public file.
   */
  private static function imageUrlToUri(string $src): ?string {
    if (str_starts_with($src, 'public://')) {
      return $src;
    }
    $path = rawurldecode((string) parse_url($src, PHP_URL_PATH));
    $public_path = '/' . trim(PublicStream::basePath(), '/') . '/';
    $position = strpos($path, $public_path);
    if ($position === FALSE) {
      return NULL;
    }
    return 'public://' . substr($path, $position + strlen($public_path));
  }

  /**
   * {@inheritdoc}
   */
  public static function trustedCallbacks(): array {
    return ['preRenderComponent'];
  }

}
