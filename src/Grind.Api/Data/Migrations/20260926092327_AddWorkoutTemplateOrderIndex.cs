using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutTemplateOrderIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrderIndex",
                table: "WorkoutTemplates",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutTemplates_UserId_OrderIndex",
                table: "WorkoutTemplates",
                columns: new[] { "UserId", "OrderIndex" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkoutTemplates_UserId_OrderIndex",
                table: "WorkoutTemplates");

            migrationBuilder.DropColumn(
                name: "OrderIndex",
                table: "WorkoutTemplates");
        }
    }
}
