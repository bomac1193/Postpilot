const Collection = require('../models/Collection');
const Content = require('../models/Content');
const { validateObjectId } = require('../utils/validators');

/**
 * Create a new collection
 */
exports.createCollection = async (req, res) => {
  try {
    const { name, description, platform, gridConfig, scheduling, tags, profileId } = req.body;

    const collection = new Collection({
      userId: req.user._id,
      profileId: profileId || undefined, // Associate with profile if provided
      name,
      description,
      platform: platform || 'instagram',
      gridConfig: gridConfig || { columns: 3, rows: 3 },
      scheduling: scheduling || {},
      tags: tags || []
    });

    await collection.save();

    res.status(201).json({
      message: 'Collection created successfully',
      collection
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({
      error: 'Failed to create collection',
      details: error.message
    });
  }
};

/**
 * Get all collections for the authenticated user
 */
exports.getCollections = async (req, res) => {
  try {
    const { status, platform, active, profileId } = req.query;

    const filter = { userId: req.user._id };

    // Filter by profile if provided
    if (profileId) {
      filter.profileId = profileId;
    }

    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (active !== undefined) filter['settings.isActive'] = active === 'true';

    const collections = await Collection.find(filter)
      .populate('items.contentId', 'title mediaUrl thumbnailUrl mediaType aiScores')
      .sort({ updatedAt: -1 });

    res.json({
      collections,
      count: collections.length
    });
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

/**
 * Get single collection by ID
 */
exports.getCollection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    }).populate('items.contentId');

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ collection });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

/**
 * Update collection
 */
exports.updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'platform', 'gridConfig', 'scheduling', 'tags', 'status', 'settings'];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        collection[field] = updates[field];
      }
    });

    // Calculate next post time if scheduling is enabled
    if (collection.scheduling.enabled) {
      const nextPostTime = collection.calculateNextPostTime();
      collection.stats.nextPostAt = nextPostTime;

      if (collection.status === 'draft') {
        collection.status = 'scheduled';
      }
    }

    await collection.save();

    res.json({
      message: 'Collection updated successfully',
      collection
    });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

/**
 * Delete collection
 */
exports.deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const collection = await Collection.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
};

/**
 * Add content to collection
 */
exports.addContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { contentId, position } = req.body;

    if (!validateObjectId(id) || !validateObjectId(contentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Verify content exists and belongs to user
    const content = await Content.findOne({
      _id: contentId,
      userId: req.user._id
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if content already in collection
    const exists = collection.items.some(
      item => item.contentId.toString() === contentId
    );

    if (exists) {
      return res.status(400).json({ error: 'Content already in collection' });
    }

    await collection.addContent(contentId, position);

    await collection.populate('items.contentId');

    res.json({
      message: 'Content added to collection',
      collection
    });
  } catch (error) {
    console.error('Add content error:', error);
    res.status(500).json({ error: 'Failed to add content' });
  }
};

/**
 * Remove content from collection
 */
exports.removeContent = async (req, res) => {
  try {
    const { id, contentId } = req.params;

    if (!validateObjectId(id) || !validateObjectId(contentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    await collection.removeContent(contentId);

    res.json({
      message: 'Content removed from collection',
      collection
    });
  } catch (error) {
    console.error('Remove content error:', error);
    res.status(500).json({ error: 'Failed to remove content' });
  }
};

/**
 * Reorder content in collection (for drag & drop)
 */
exports.reorderContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { contentId, position, order }

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (!collection.settings.allowReordering) {
      return res.status(403).json({ error: 'Reordering not allowed for this collection' });
    }

    // Update positions and order
    items.forEach(update => {
      const item = collection.items.find(
        item => item.contentId.toString() === update.contentId
      );

      if (item) {
        if (update.position) item.position = update.position;
        if (update.order !== undefined) item.order = update.order;
      }
    });

    await collection.save();
    await collection.populate('items.contentId');

    res.json({
      message: 'Collection reordered successfully',
      collection
    });
  } catch (error) {
    console.error('Reorder content error:', error);
    res.status(500).json({ error: 'Failed to reorder content' });
  }
};

/**
 * Duplicate collection
 */
exports.duplicateCollection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const original = await Collection.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!original) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const duplicate = new Collection({
      userId: req.user._id,
      name: `${original.name} (Copy)`,
      description: original.description,
      platform: original.platform,
      gridConfig: original.gridConfig,
      items: original.items.map(item => ({
        contentId: item.contentId,
        position: item.position,
        order: item.order,
        posted: false
      })),
      tags: original.tags,
      status: 'draft'
    });

    await duplicate.save();

    res.status(201).json({
      message: 'Collection duplicated successfully',
      collection: duplicate
    });
  } catch (error) {
    console.error('Duplicate collection error:', error);
    res.status(500).json({ error: 'Failed to duplicate collection' });
  }
};

/**
 * Preview collection grid
 */
exports.previewCollection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid collection ID' });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user._id
    }).populate('items.contentId', 'title mediaUrl thumbnailUrl mediaType');

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Build grid preview
    const grid = [];
    const { columns, rows } = collection.gridConfig;

    for (let row = 0; row < rows; row++) {
      const gridRow = [];
      for (let col = 0; col < columns; col++) {
        const item = collection.items.find(
          item => item.position.row === row && item.position.col === col
        );

        gridRow.push({
          position: { row, col },
          content: item ? item.contentId : null,
          posted: item ? item.posted : false
        });
      }
      grid.push(gridRow);
    }

    res.json({
      collection: {
        id: collection._id,
        name: collection.name,
        platform: collection.platform,
        gridConfig: collection.gridConfig,
        status: collection.status,
        stats: collection.stats
      },
      grid
    });
  } catch (error) {
    console.error('Preview collection error:', error);
    res.status(500).json({ error: 'Failed to preview collection' });
  }
};

/**
 * Get collection statistics
 */
exports.getCollectionStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Collection.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalCollections: { $sum: 1 },
          activeCollections: {
            $sum: { $cond: [{ $eq: ['$settings.isActive', true] }, 1, 0] }
          },
          scheduledCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          completedCollections: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalItems: { $sum: '$stats.totalItems' },
          postedItems: { $sum: '$stats.postedItems' }
        }
      }
    ]);

    const result = stats[0] || {
      totalCollections: 0,
      activeCollections: 0,
      scheduledCollections: 0,
      completedCollections: 0,
      totalItems: 0,
      postedItems: 0
    };

    res.json({ stats: result });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

module.exports = exports;
