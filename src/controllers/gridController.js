const Grid = require('../models/Grid');
const Content = require('../models/Content');

const DEFAULT_CROP = { scale: 1, offsetX: 0, offsetY: 0 };
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeCrop = (input = {}) => ({
  scale: clamp(Number(input.scale) || 1, 0.5, 3),
  offsetX: clamp(Number(input.offsetX) || 0, -100, 100),
  offsetY: clamp(Number(input.offsetY) || 0, -100, 100)
});

const normalizeGrid = (grid) => {
  if (!grid || !Array.isArray(grid.cells)) return;
  grid.cells.forEach(cell => {
    if (!cell.crop) {
      cell.crop = { ...DEFAULT_CROP };
    }
  });
};

const createEmptyCell = (row, col) => ({
  position: { row, col },
  isEmpty: true,
  crop: { ...DEFAULT_CROP }
});

const populateGrid = async (gridId) => {
  const populated = await Grid.findById(gridId).populate('cells.contentId');
  normalizeGrid(populated);
  return populated;
};

// Create new grid
exports.createGrid = async (req, res) => {
  try {
    const { name, platform, columns, totalRows } = req.body;

    // Initialize empty cells
    const cells = [];
    for (let row = 0; row < (totalRows || 3); row++) {
      for (let col = 0; col < (columns || 3); col++) {
        cells.push(createEmptyCell(row, col));
      }
    }

    const grid = new Grid({
      userId: req.userId,
      name: name || 'Untitled Grid',
      platform: platform || 'instagram',
      columns: columns || 3,
      totalRows: totalRows || 3,
      cells
    });

    await grid.save();
    normalizeGrid(grid);

    res.status(201).json({
      message: 'Grid created successfully',
      grid
    });
  } catch (error) {
    console.error('Create grid error:', error);
    res.status(500).json({ error: 'Failed to create grid' });
  }
};

// Get all grids for user
exports.getAllGrids = async (req, res) => {
  try {
    const grids = await Grid.find({ userId: req.userId })
      .populate('cells.contentId')
      .sort({ updatedAt: -1 });
    grids.forEach(normalizeGrid);

    res.json({ grids });
  } catch (error) {
    console.error('Get grids error:', error);
    res.status(500).json({ error: 'Failed to get grids' });
  }
};

// Get grid by ID
exports.getGridById = async (req, res) => {
  try {
    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId })
      .populate('cells.contentId');

    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    normalizeGrid(grid);
    res.json({ grid });
  } catch (error) {
    console.error('Get grid error:', error);
    res.status(500).json({ error: 'Failed to get grid' });
  }
};

// Update grid
exports.updateGrid = async (req, res) => {
  try {
    const { name, platform, columns, isActive } = req.body;

    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    if (name) grid.name = name;
    if (platform) grid.platform = platform;
    if (columns) grid.columns = columns;
    if (isActive !== undefined) grid.isActive = isActive;

    await grid.save();

    res.json({
      message: 'Grid updated successfully',
      grid
    });
  } catch (error) {
    console.error('Update grid error:', error);
    res.status(500).json({ error: 'Failed to update grid' });
  }
};

// Delete grid
exports.deleteGrid = async (req, res) => {
  try {
    const grid = await Grid.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    res.json({ message: 'Grid deleted successfully' });
  } catch (error) {
    console.error('Delete grid error:', error);
    res.status(500).json({ error: 'Failed to delete grid' });
  }
};

// Add row to grid
exports.addRow = async (req, res) => {
  try {
    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    const newRow = grid.totalRows;
    for (let col = 0; col < grid.columns; col++) {
      grid.cells.push(createEmptyCell(newRow, col));
    }

    grid.totalRows += 1;
    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Row added successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Add row error:', error);
    res.status(500).json({ error: 'Failed to add row' });
  }
};

// Remove row from grid
exports.removeRow = async (req, res) => {
  try {
    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    if (grid.totalRows <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last row' });
    }

    const lastRow = grid.totalRows - 1;
    grid.cells = grid.cells.filter(cell => cell.position.row !== lastRow);
    grid.totalRows -= 1;

    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Row removed successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Remove row error:', error);
    res.status(500).json({ error: 'Failed to remove row' });
  }
};

// Add content to grid
exports.addContentToGrid = async (req, res) => {
  try {
    const { contentId, row, col } = req.body;
    const rowNum = Number(row) || 0;
    const colNum = Number(col) || 0;

    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // Verify content exists and belongs to user
    const content = await Content.findOne({ _id: contentId, userId: req.userId });
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Auto-expand grid if needed
    const neededRows = rowNum + 1;
    if (grid.totalRows < neededRows) {
      // Add new rows
      for (let r = grid.totalRows; r < neededRows; r++) {
        for (let c = 0; c < grid.columns; c++) {
          grid.cells.push(createEmptyCell(r, c));
        }
      }
      grid.totalRows = neededRows;
    }

    // Find the cell (should exist now)
    let cell = grid.cells.find(c => c.position.row === rowNum && c.position.col === colNum);

    // Create cell if it doesn't exist (edge case)
    if (!cell) {
      cell = createEmptyCell(rowNum, colNum);
      grid.cells.push(cell);
    }

    // Update cell
    cell.contentId = contentId;
    cell.isEmpty = false;
    cell.crop = { ...DEFAULT_CROP };

    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Content added to grid successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Add content to grid error:', error);
    res.status(500).json({ error: 'Failed to add content to grid' });
  }
};

// Remove content from grid
exports.removeContentFromGrid = async (req, res) => {
  try {
    const { row, col, contentId } = req.body;

    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    let cell;
    // Find by contentId if provided, otherwise by row/col
    if (contentId) {
      cell = grid.cells.find(c => c.contentId && c.contentId.toString() === contentId.toString());
    } else if (row !== undefined && col !== undefined) {
      cell = grid.cells.find(c => c.position.row === row && c.position.col === col);
    }

    if (!cell) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    cell.contentId = null;
    cell.isEmpty = true;
    cell.crop = { ...DEFAULT_CROP };

    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Content removed from grid successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Remove content from grid error:', error);
    res.status(500).json({ error: 'Failed to remove content from grid' });
  }
};

// Reorder content in grid
exports.reorderContent = async (req, res) => {
  try {
    const { items, moves } = req.body;

    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    // New format: items is array of { contentId, position } representing the new order
    if (items && Array.isArray(items)) {
      const cols = grid.columns || 3;

      // Build a map of new positions: position -> contentId
      const newPositions = new Map();
      for (const item of items) {
        if (item.contentId) {
          newPositions.set(item.position, item.contentId);
        }
      }

      // Update each cell based on its position
      for (const cell of grid.cells) {
        const cellPosition = cell.position.row * cols + cell.position.col;

        if (newPositions.has(cellPosition)) {
          cell.contentId = newPositions.get(cellPosition);
          cell.isEmpty = false;
        } else {
          cell.contentId = null;
          cell.isEmpty = true;
        }
      }

      // Ensure cells exist for all positions that have content
      for (const [position, contentId] of newPositions) {
        const row = Math.floor(position / cols);
        const col = position % cols;

        const existingCell = grid.cells.find(c => c.position.row === row && c.position.col === col);
        if (!existingCell) {
          grid.cells.push({
            position: { row, col },
            contentId: contentId,
            isEmpty: false,
            crop: { ...DEFAULT_CROP }
          });
        }
      }

      // Update row count if needed
      const maxRow = items.length > 0
        ? Math.max(...items.map(i => Math.floor(i.position / cols)))
        : 0;
      if (maxRow + 1 > grid.totalRows) {
        grid.totalRows = maxRow + 1;
      }

      // Mark cells as modified for Mongoose to detect changes
      grid.markModified('cells');
    }
    // Legacy format: moves is array of { from: {row, col}, to: {row, col} }
    else if (moves && Array.isArray(moves)) {
      for (const move of moves) {
        const fromCell = grid.cells.find(c => c.position.row === move.from.row && c.position.col === move.from.col);
        const toCell = grid.cells.find(c => c.position.row === move.to.row && c.position.col === move.to.col);

        if (fromCell && toCell) {
          // Swap content
          const tempContent = toCell.contentId;
          const tempIsEmpty = toCell.isEmpty;
          const tempCrop = toCell.crop ? { ...toCell.crop } : { ...DEFAULT_CROP };

          toCell.contentId = fromCell.contentId;
          toCell.isEmpty = fromCell.isEmpty;
          toCell.crop = fromCell.crop || { ...DEFAULT_CROP };

          fromCell.contentId = tempContent;
          fromCell.isEmpty = tempIsEmpty;
          fromCell.crop = tempCrop;
        }
      }
    } else {
      return res.status(400).json({ error: 'items or moves array required' });
    }

    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Content reordered successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Reorder content error:', error);
    res.status(500).json({ error: 'Failed to reorder content' });
  }
};

// Update crop for a grid cell
exports.updateCellCrop = async (req, res) => {
  try {
    const { row, col, crop } = req.body || {};
    const rowIndex = Number(row);
    const colIndex = Number(col);

    if (Number.isNaN(rowIndex) || Number.isNaN(colIndex) || !crop) {
      return res.status(400).json({ error: 'row, col, and crop are required' });
    }

    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId });
    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    const cell = grid.cells.find(c => c.position.row === rowIndex && c.position.col === colIndex);
    if (!cell) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    cell.crop = sanitizeCrop(crop);
    await grid.save();
    const populated = await populateGrid(grid._id);

    res.json({
      message: 'Crop updated successfully',
      grid: populated
    });
  } catch (error) {
    console.error('Update crop error:', error);
    res.status(500).json({ error: 'Failed to update crop' });
  }
};

// Get grid preview
exports.getGridPreview = async (req, res) => {
  try {
    const grid = await Grid.findOne({ _id: req.params.id, userId: req.userId })
      .populate('cells.contentId');

    if (!grid) {
      return res.status(404).json({ error: 'Grid not found' });
    }

    normalizeGrid(grid);
    // Format grid for preview
    const preview = {
      name: grid.name,
      platform: grid.platform,
      columns: grid.columns,
      rows: grid.totalRows,
      cells: grid.cells.map(cell => ({
        position: cell.position,
        content: cell.isEmpty ? null : {
          id: cell.contentId._id,
          thumbnailUrl: cell.contentId.thumbnailUrl || cell.contentId.mediaUrl,
          mediaType: cell.contentId.mediaType,
          caption: cell.contentId.caption,
          aiScores: cell.contentId.aiScores
        }
      }))
    };

    res.json({ preview });
  } catch (error) {
    console.error('Get grid preview error:', error);
    res.status(500).json({ error: 'Failed to get grid preview' });
  }
};
