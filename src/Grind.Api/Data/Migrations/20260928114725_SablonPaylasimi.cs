using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SablonPaylasimi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSharedOverride",
                table: "WorkoutTemplates",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SavedFromUserId",
                table: "WorkoutTemplates",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutTemplates_SavedFromUserId",
                table: "WorkoutTemplates",
                column: "SavedFromUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkoutTemplates_Users_SavedFromUserId",
                table: "WorkoutTemplates",
                column: "SavedFromUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkoutTemplates_Users_SavedFromUserId",
                table: "WorkoutTemplates");

            migrationBuilder.DropIndex(
                name: "IX_WorkoutTemplates_SavedFromUserId",
                table: "WorkoutTemplates");

            migrationBuilder.DropColumn(
                name: "IsSharedOverride",
                table: "WorkoutTemplates");

            migrationBuilder.DropColumn(
                name: "SavedFromUserId",
                table: "WorkoutTemplates");
        }
    }
}
